import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { OrionController } from './orion.controller';

describe('OrionController contract', () => {
  it('keeps the admin/orion namespace protected by AuthAdminGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, OrionController)).toBe(
      'admin/orion',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, OrionController)).toContain(
      AuthAdminGuard,
    );
  });

  it('delegates health to OrionHealthService', async () => {
    const health = {
      status: 'degraded',
      mode: 'DEGRADED',
      degraded: true,
      mongo: { ok: true, latencyMs: 3 },
      vertex: { configured: false, ok: false },
      tavily: { configured: false },
      version: 'orion-0.1.0',
    };
    const healthService = {
      getHealth: jest.fn().mockResolvedValue(health),
    };
    const snapshotService = {
      getSnapshot: jest.fn(),
    };
    const controller = new OrionController(
      healthService as never,
      snapshotService as never,
    );

    await expect(controller.getHealth()).resolves.toEqual(health);
    expect(healthService.getHealth).toHaveBeenCalledTimes(1);
    expect(snapshotService.getSnapshot).not.toHaveBeenCalled();
  });

  it('delegates context/snapshot to OrionSnapshotService', async () => {
    const snapshot = {
      generatedAt: '2026-07-20T00:00:00.000Z',
      currency: 'THB',
      cached: false,
      withdrawByStatus: {
        pending: { count: 1, total: 100, oldestAt: null },
        approved: { count: 0, total: 0 },
        rejected: { count: 0, total: 0 },
      },
      unknownWithdrawCount: 0,
      offers: {
        stub: true,
        liveCount: null,
        note: 'stub',
      },
    };
    const healthService = { getHealth: jest.fn() };
    const snapshotService = {
      getSnapshot: jest.fn().mockResolvedValue(snapshot),
    };
    const controller = new OrionController(
      healthService as never,
      snapshotService as never,
    );

    await expect(controller.getContextSnapshot()).resolves.toEqual(snapshot);
    expect(snapshotService.getSnapshot).toHaveBeenCalledTimes(1);
  });
});
