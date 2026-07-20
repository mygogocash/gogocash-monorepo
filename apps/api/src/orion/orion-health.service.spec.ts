import { OrionHealthService, ORION_VERSION } from './orion-health.service';

describe('OrionHealthService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  function buildService(options: {
    ping?: () => Promise<unknown>;
    dbMissing?: boolean;
  } = {}) {
    const command =
      options.ping ?? jest.fn().mockResolvedValue({ ok: 1 });
    const connection = options.dbMissing
      ? { db: undefined }
      : {
          db: {
            admin: () => ({ command }),
          },
        };
    return {
      service: new OrionHealthService(connection as never),
      command,
    };
  }

  it('defaults to DEGRADED when ORION_MODE is unset', async () => {
    delete process.env.ORION_MODE;
    delete process.env.ORION_VERTEX_PROJECT;
    delete process.env.VERTEX_API_KEY;
    delete process.env.TAVILY_API_KEY;

    const { service, command } = buildService();
    const health = await service.getHealth();

    expect(command).toHaveBeenCalledWith({ ping: 1 });
    expect(health).toMatchObject({
      status: 'degraded',
      mode: 'DEGRADED',
      degraded: true,
      mongo: { ok: true },
      vertex: { configured: false, ok: false },
      tavily: { configured: false },
      version: ORION_VERSION,
    });
    expect(typeof health.mongo.latencyMs).toBe('number');
  });

  it('reports LIVE mode but still degraded without Vertex configured', async () => {
    process.env.ORION_MODE = 'LIVE';
    delete process.env.ORION_VERTEX_PROJECT;
    delete process.env.VERTEX_API_KEY;

    const { service } = buildService();
    const health = await service.getHealth();

    expect(health.mode).toBe('LIVE');
    expect(health.degraded).toBe(true);
    expect(health.status).toBe('degraded');
    expect(health.vertex).toEqual({ configured: false, ok: false });
  });

  it('marks vertex configured when ORION_VERTEX_PROJECT is set (Phase 0 still ok:false)', async () => {
    process.env.ORION_MODE = 'LIVE';
    process.env.ORION_VERTEX_PROJECT = 'gogocash-orion';
    process.env.TAVILY_API_KEY = 'tvly-test';

    const { service } = buildService();
    const health = await service.getHealth();

    expect(health.vertex).toEqual({ configured: true, ok: false });
    expect(health.tavily).toEqual({ configured: true });
    // Phase 0: Vertex is not called, so health remains degraded.
    expect(health.degraded).toBe(true);
  });

  it('returns error status when mongo ping fails', async () => {
    process.env.ORION_MODE = 'DEGRADED';
    const { service } = buildService({
      ping: jest.fn().mockRejectedValue(new Error('mongo down')),
    });

    const health = await service.getHealth();

    expect(health.mongo.ok).toBe(false);
    expect(health.status).toBe('error');
    expect(health.degraded).toBe(true);
    expect(typeof health.mongo.latencyMs).toBe('number');
  });

  it('returns mongo.ok false when the connection has no db yet', async () => {
    const { service } = buildService({ dbMissing: true });
    const health = await service.getHealth();

    expect(health.mongo).toEqual({ ok: false, latencyMs: null });
    expect(health.status).toBe('error');
  });
});
