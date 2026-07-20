import { OrionSnapshotService } from './orion-snapshot.service';

describe('OrionSnapshotService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.useRealTimers();
  });

  function buildService(rows: unknown[] = []) {
    const aggregate = jest.fn().mockResolvedValue(rows);
    const withdrawModel = { aggregate };
    const service = new OrionSnapshotService(withdrawModel as never);
    return { service, aggregate };
  }

  it('aggregates withdraw buckets without PII fields', async () => {
    delete process.env.ORION_SNAPSHOT_TTL_SEC;
    const { service, aggregate } = buildService([
      {
        _id: 'pending',
        count: 2,
        totalAmount: 150.5,
        oldestAt: new Date('2026-07-01T00:00:00.000Z'),
      },
      { _id: 'approved', count: 1, totalAmount: 200 },
      { _id: 'completed', count: 1, totalAmount: 50 },
      { _id: 'rejected', count: 3, totalAmount: 999 },
      { _id: 'mystery', count: 4, totalAmount: 10 },
    ]);

    const snapshot = await service.getSnapshot();

    expect(aggregate).toHaveBeenCalledWith([
      { $match: { currency: 'THB' } },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$status', 'unknown'] } },
          count: { $sum: 1 },
          totalAmount: {
            $sum: {
              $convert: {
                input: '$amount_total',
                to: 'double',
                onError: 0,
                onNull: 0,
              },
            },
          },
          oldestAt: { $min: '$createdAt' },
        },
      },
    ]);

    expect(snapshot.currency).toBe('THB');
    expect(snapshot.cached).toBe(false);
    expect(snapshot.withdrawByStatus).toEqual({
      pending: {
        count: 2,
        total: 150.5,
        oldestAt: '2026-07-01T00:00:00.000Z',
      },
      approved: { count: 2, total: 250 },
      rejected: { count: 3, total: 0 },
    });
    expect(snapshot.unknownWithdrawCount).toBe(4);
    expect(snapshot.offers).toEqual({
      stub: true,
      liveCount: null,
      note: expect.stringContaining('Phase 0'),
    });

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toMatch(/account_number|address|user_id|tx_hash/i);
  });

  it('serves from in-memory TTL cache within ORION_SNAPSHOT_TTL_SEC', async () => {
    process.env.ORION_SNAPSHOT_TTL_SEC = '90';
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));

    const { service, aggregate } = buildService([
      { _id: 'pending', count: 1, totalAmount: 10, oldestAt: null },
    ]);

    const first = await service.getSnapshot();
    expect(first.cached).toBe(false);
    expect(aggregate).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-07-20T10:01:00.000Z'));
    const second = await service.getSnapshot();
    expect(second.cached).toBe(true);
    expect(second.withdrawByStatus).toEqual(first.withdrawByStatus);
    expect(aggregate).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-07-20T10:01:31.000Z'));
    const third = await service.getSnapshot();
    expect(third.cached).toBe(false);
    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('returns empty buckets when aggregate is empty', async () => {
    const { service } = buildService([]);
    const snapshot = await service.getSnapshot();

    expect(snapshot.withdrawByStatus).toEqual({
      pending: { count: 0, total: 0, oldestAt: null },
      approved: { count: 0, total: 0 },
      rejected: { count: 0, total: 0 },
    });
    expect(snapshot.unknownWithdrawCount).toBe(0);
  });
});
