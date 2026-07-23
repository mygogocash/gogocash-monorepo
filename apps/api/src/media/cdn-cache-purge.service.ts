import { Injectable, Logger } from '@nestjs/common';

export interface CdnCachePurgeResult {
  purged: boolean;
  reason?: string;
}

type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/**
 * Best-effort Cloudflare edge-cache purge for deleted public media.
 *
 * Command-owned media is content-addressed and uploaded with
 * `Cache-Control: public, max-age=31536000`, so Cloudflare serves it
 * indefinitely from the edge. That is correct for LIVE objects (same content
 * hash → same bytes), but a *deleted* object keeps being served from cache long
 * after its R2 origin is gone (verified 404 at origin). Purging the exact file
 * URL on delete closes that gap.
 *
 * Fail-closed to a no-op when unconfigured, and never throws: a purge failure
 * must not fail the authoritative R2 delete that already succeeded.
 */
@Injectable()
export class CdnCachePurgeService {
  private readonly logger = new Logger(CdnCachePurgeService.name);
  private static readonly PURGE_TIMEOUT_MS = 8_000;

  async purgeUrls(
    urls: string[],
    fetchImpl: FetchLike = fetch as unknown as FetchLike,
  ): Promise<CdnCachePurgeResult> {
    const zoneId = process.env.CF_PURGE_ZONE_ID?.trim();
    const apiToken = process.env.CF_PURGE_API_TOKEN?.trim();
    if (!zoneId || !apiToken) {
      return { purged: false, reason: 'unconfigured' };
    }
    const files = urls.filter((url) => typeof url === 'string' && url.trim());
    if (files.length === 0) {
      return { purged: false, reason: 'no-urls' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      CdnCachePurgeService.PURGE_TIMEOUT_MS,
    );
    try {
      const response = await fetchImpl(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `Cloudflare cache purge returned ${response.status} for ${files.length} file(s)`,
        );
        return { purged: false, reason: `http ${response.status}` };
      }
      return { purged: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Cloudflare cache purge failed: ${message}`);
      return { purged: false, reason: message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
