import { Types } from 'mongoose';

import { QuestReconciliationService } from './quest-reconciliation.service';

function queryResult<T>(rows: T[]) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

describe('QuestReconciliationService', () => {
  it('advances beyond an oldest full page whose outboxes already exist', async () => {
    const existing = Array.from({ length: 100 }, (_, index) => ({
      _id: new Types.ObjectId(index.toString(16).padStart(24, '0')),
      transition_id: `account:existing-${index}:created:v1`,
      user_id: new Types.ObjectId(),
      version: 1,
      registration_source: 'firebase_google',
      occurred_at: new Date('2026-07-17T00:00:00.000Z'),
    }));
    const missing = {
      _id: new Types.ObjectId('ffffffffffffffffffffffff'),
      transition_id: 'account:missing:created:v1',
      user_id: new Types.ObjectId(),
      version: 1,
      registration_source: 'line',
      occurred_at: new Date('2026-07-17T00:00:00.000Z'),
    };
    const accountTransitionModel = {
      find: jest
        .fn()
        .mockReturnValueOnce(queryResult(existing))
        .mockReturnValueOnce(queryResult([missing]))
        .mockReturnValueOnce(queryResult([])),
    };
    const conversionTransitionModel = {
      find: jest.fn().mockReturnValue(queryResult([])),
    };
    const outboxModel = {
      exists: jest
        .fn()
        .mockResolvedValueOnce({ _id: 'present' })
        .mockResolvedValue({ _id: 'present' }),
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
    };
    // The first 100 lookups exist; the 101st is missing.
    outboxModel.exists.mockImplementation(async (filter) =>
      filter.source_event_id === missing.transition_id
        ? null
        : { _id: 'present' },
    );
    const service = new QuestReconciliationService(
      {} as never,
      accountTransitionModel as never,
      conversionTransitionModel as never,
      {} as never,
      outboxModel as never,
      { exists: jest.fn() } as never,
      {} as never,
      {
        enabled: true,
        assertReady: jest.fn().mockResolvedValue({ supported: true }),
      } as never,
    );

    await expect(service.reconcileMissingOutbox(100)).resolves.toBe(1);
    expect(accountTransitionModel.find).toHaveBeenCalledTimes(2);
    expect(outboxModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ source_event_id: missing.transition_id }),
      expect.anything(),
      { upsert: true },
    );
  });

  it('never promotes the original quarantined payload without provider verification', async () => {
    const quarantineModel = {
      find: jest.fn().mockReturnValue(queryResult([])),
      updateOne: jest.fn(),
    };
    const lifecycle = { ingest: jest.fn() };
    const service = new QuestReconciliationService(
      {} as never,
      {} as never,
      {} as never,
      quarantineModel as never,
      {} as never,
      {} as never,
      lifecycle as never,
      {
        enabled: true,
        assertReady: jest.fn().mockResolvedValue({ supported: true }),
      } as never,
    );

    await expect(service.resolveAuthoritativeQuarantine(10)).resolves.toBe(0);
    expect(quarantineModel.find).toHaveBeenCalledWith({
      status: 'pending',
      authoritative_payload: { $type: 'object' },
      authoritative_verified_at: { $type: 'date' },
    });
    expect(lifecycle.ingest).not.toHaveBeenCalled();
  });

  it('replays only a provider-verified authoritative payload', async () => {
    const row = {
      _id: new Types.ObjectId(),
      payload: { conversion_status: 'approved', untrusted: true },
      authoritative_payload: {
        conversion_id: 99,
        conversion_status: 'rejected',
      },
      authoritative_verified_at: new Date('2026-07-17T04:00:00.000Z'),
    };
    const quarantineModel = {
      find: jest.fn().mockReturnValue(queryResult([row])),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const lifecycle = {
      ingest: jest.fn().mockResolvedValue({
        outcome: 'applied',
        source_event_id: 'conversion:verified:v2',
      }),
    };
    const service = new QuestReconciliationService(
      {} as never,
      {} as never,
      {} as never,
      quarantineModel as never,
      {} as never,
      {} as never,
      lifecycle as never,
      {
        enabled: true,
        assertReady: jest.fn().mockResolvedValue({ supported: true }),
      } as never,
    );

    await expect(service.resolveAuthoritativeQuarantine(10)).resolves.toBe(1);
    expect(lifecycle.ingest).toHaveBeenCalledWith(row.authoritative_payload, {
      adapter: 'reconciliation',
      authoritative: true,
      occurred_at: row.authoritative_verified_at,
    });
    expect(lifecycle.ingest).not.toHaveBeenCalledWith(
      row.payload,
      expect.anything(),
    );
  });
});
