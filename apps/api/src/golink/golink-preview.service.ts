import { Injectable, Logger } from '@nestjs/common';
import {
  extractOpenGraphPreview,
  isAllowedGoLinkPreviewHost,
  type GoLinkOpenGraphPreview,
} from './golink-preview.util';

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 512 * 1024;

const EMPTY_PREVIEW: GoLinkOpenGraphPreview = {
  title: null,
  imageUrl: null,
  description: null,
  price: null,
};

@Injectable()
export class GolinkPreviewService {
  private readonly logger = new Logger(GolinkPreviewService.name);

  async preview(url: string): Promise<GoLinkOpenGraphPreview> {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return EMPTY_PREVIEW;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return EMPTY_PREVIEW;
    }

    if (!isAllowedGoLinkPreviewHost(parsed.hostname)) {
      return EMPTY_PREVIEW;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(parsed.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'GoGoCash-GoLinkPreview/1.0',
        },
      });

      if (!response.ok) {
        return EMPTY_PREVIEW;
      }

      const finalHost = new URL(response.url).hostname;
      if (!isAllowedGoLinkPreviewHost(finalHost)) {
        return EMPTY_PREVIEW;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > MAX_BODY_BYTES) {
        return EMPTY_PREVIEW;
      }

      return extractOpenGraphPreview(buffer.toString('utf8'));
    } catch (error) {
      this.logger.warn(
        `GoLink preview failed for ${parsed.hostname}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return EMPTY_PREVIEW;
    } finally {
      clearTimeout(timer);
    }
  }
}
