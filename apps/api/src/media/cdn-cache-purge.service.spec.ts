import { CdnCachePurgeService } from './cdn-cache-purge.service';

const ZONE = 'zone123';
const TOKEN = 'cf-token-abc';

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => Promise<void>,
): Promise<void> {
  const keys = ['CF_PURGE_ZONE_ID', 'CF_PURGE_API_TOKEN'];
  const prior: Record<string, string | undefined> = {};
  for (const k of keys) prior[k] = process.env[k];
  for (const k of keys) {
    if (overrides[k] === undefined) delete process.env[k];
    else process.env[k] = overrides[k];
  }
  return run().finally(() => {
    for (const k of keys) {
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
    }
  });
}

describe('CdnCachePurgeService', () => {
  const service = new CdnCachePurgeService();

  it('given no CF config > then it is a no-op and never calls fetch', async () => {
    await withEnv(
      { CF_PURGE_ZONE_ID: undefined, CF_PURGE_API_TOKEN: undefined },
      async () => {
        const fetchImpl = jest.fn();
        const result = await service.purgeUrls(
          ['https://media/x.webp'],
          fetchImpl,
        );
        expect(result).toEqual({ purged: false, reason: 'unconfigured' });
        expect(fetchImpl).not.toHaveBeenCalled();
      },
    );
  });

  it('given no urls > then no-op', async () => {
    await withEnv(
      { CF_PURGE_ZONE_ID: ZONE, CF_PURGE_API_TOKEN: TOKEN },
      async () => {
        const fetchImpl = jest.fn();
        const result = await service.purgeUrls([], fetchImpl);
        expect(result).toEqual({ purged: false, reason: 'no-urls' });
        expect(fetchImpl).not.toHaveBeenCalled();
      },
    );
  });

  it('given CF config > then posts the files to the zone purge endpoint with the bearer token', async () => {
    await withEnv(
      { CF_PURGE_ZONE_ID: ZONE, CF_PURGE_API_TOKEN: TOKEN },
      async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        });
        const urls = ['https://media/a.webp', 'https://media/b.webp'];
        const result = await service.purgeUrls(urls, fetchImpl);
        expect(result).toEqual({ purged: true });
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe(
          `https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`,
        );
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
        expect(JSON.parse(init.body)).toEqual({ files: urls });
      },
    );
  });

  it('given a non-2xx response > then reports not purged without throwing', async () => {
    await withEnv(
      { CF_PURGE_ZONE_ID: ZONE, CF_PURGE_API_TOKEN: TOKEN },
      async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
          ok: false,
          status: 403,
          json: async () => ({}),
        });
        const result = await service.purgeUrls(
          ['https://media/a.webp'],
          fetchImpl,
        );
        expect(result.purged).toBe(false);
        expect(result.reason).toContain('403');
      },
    );
  });

  it('given fetch rejects > then swallows the error and reports not purged', async () => {
    await withEnv(
      { CF_PURGE_ZONE_ID: ZONE, CF_PURGE_API_TOKEN: TOKEN },
      async () => {
        const fetchImpl = jest
          .fn()
          .mockRejectedValue(new Error('network down'));
        const result = await service.purgeUrls(
          ['https://media/a.webp'],
          fetchImpl,
        );
        expect(result.purged).toBe(false);
        expect(result.reason).toContain('network down');
      },
    );
  });
});
