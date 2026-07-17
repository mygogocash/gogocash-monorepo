import { ServiceUnavailableException } from '@nestjs/common';
import { Types } from 'mongoose';

import { QuestConversionLifecycleService } from './conversion-lifecycle.service';

describe('QuestConversionLifecycleService', () => {
  const originalEnv = process.env;
  const conversionObjectId = new Types.ObjectId();

  afterEach(() => {
    process.env = originalEnv;
  });

  function conversion(overrides: Record<string, unknown> = {}) {
    return {
      conversion_id: 9001,
      source: 'involve',
      network_account: 'publisher-th',
      offer_id: 10,
      offer_name: 'Shop',
      merchant_id: 20,
      aff_sub1: 'user_id:68bf99fed9667685c1637607',
      conversion_status: 'pending',
      datetime_conversion: new Date('2026-07-17T01:00:00.000Z'),
      currency: 'THB',
      sale_amount: 100,
      payout: 5,
      ...overrides,
    };
  }

  function current(overrides: Record<string, unknown> = {}) {
    return {
      _id: conversionObjectId,
      ...conversion({
        provider_account: 'publisher-th',
        provider_conversion_id: '9001',
        lifecycle_transition_version: 1,
        lifecycle_transition_id:
          'conversion:involve:publisher-th:9001:transition:v1',
        lifecycle_occurred_at: new Date('2026-07-17T01:00:00.000Z'),
        lifecycle_payload_hash: 'old-hash',
      }),
      ...overrides,
    };
  }

  function makeService(existing: Record<string, unknown> | null = null) {
    const session = {
      withTransaction: jest.fn(async (operation: () => Promise<void>) =>
        operation(),
      ),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    const conversionModel = {
      findOne: jest.fn().mockResolvedValue(existing),
      findOneAndUpdate: jest.fn().mockResolvedValue({
        _id: conversionObjectId,
      }),
    };
    const transitionModel = { create: jest.fn().mockResolvedValue([]) };
    const quarantineModel = {
      updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
    };
    const outboxModel = { create: jest.fn().mockResolvedValue([]) };
    const transactions = {
      enabled: true,
      durableJournalRequired: jest.fn().mockResolvedValue(true),
      assertReady: jest.fn().mockResolvedValue({ supported: true }),
    };
    const revisionFence = {
      freezeMatchingInSession: jest.fn().mockResolvedValue(1),
    };
    const service = new QuestConversionLifecycleService(
      connection as never,
      conversionModel as never,
      transitionModel as never,
      quarantineModel as never,
      outboxModel as never,
      transactions as never,
      revisionFence as never,
    );
    return {
      service,
      session,
      connection,
      conversionModel,
      transitionModel,
      quarantineModel,
      outboxModel,
      transactions,
      revisionFence,
    };
  }

  it('fails readiness before mutating the conversion source', async () => {
    const mocks = makeService();
    const unavailable = new ServiceUnavailableException('standalone');
    mocks.transactions.assertReady.mockRejectedValue(unavailable);

    await expect(mocks.service.ingest(conversion())).rejects.toBe(unavailable);
    expect(mocks.connection.startSession).not.toHaveBeenCalled();
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('updates a legacy Involve row by raw conversion id while task-v2 is off', async () => {
    const mocks = makeService();
    mocks.transactions.enabled = false;
    mocks.transactions.durableJournalRequired.mockResolvedValue(false);

    await expect(mocks.service.ingest(conversion())).resolves.toEqual({
      outcome: 'legacy_applied',
    });

    expect(mocks.transactions.assertReady).not.toHaveBeenCalled();
    expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { conversion_id: 9001 },
      expect.objectContaining({
        conversion_id: 9001,
        source: 'involve',
        provider_account: 'publisher-th',
        provider_conversion_id: '9001',
      }),
      { upsert: true, new: true },
    );
  });

  it('journals a reversal while evaluation is disabled after task-v2 preparation', async () => {
    const mocks = makeService(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 2,
      }),
    );
    mocks.transactions.enabled = false;
    mocks.transactions.durableJournalRequired.mockResolvedValue(true);

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'rejected' }), {
        provider_transition_version: 3,
        occurred_at: new Date('2026-07-17T03:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      outcome: 'applied',
      event_type: 'reversed',
      transition_version: 3,
      source_event_id: 'conversion:involve:publisher-th:9001:transition:v3',
    });

    expect(mocks.transactions.assertReady).toHaveBeenCalledTimes(1);
    expect(mocks.transitionModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          transition_id: 'conversion:involve:publisher-th:9001:transition:v3',
          from_status: 'approved',
          to_status: 'rejected',
          event_type: 'reversed',
        }),
      ],
      { session: mocks.session },
    );
    expect(mocks.outboxModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          source_event_id: 'conversion:involve:publisher-th:9001:transition:v3',
          event_type: 'reversed',
          status: 'pending',
          attempts: 0,
        }),
      ],
      { session: mocks.session },
    );
  });

  it('keeps a disabled-period journal retry exact-once', async () => {
    const payload = conversion({ conversion_status: 'rejected' });
    const mocks = makeService(
      current({
        conversion_status: 'rejected',
        lifecycle_transition_version: 3,
      }),
    );
    mocks.transactions.enabled = false;
    mocks.transactions.durableJournalRequired.mockResolvedValue(true);
    mocks.conversionModel.findOne.mockResolvedValue(
      current({
        conversion_status: 'rejected',
        lifecycle_transition_version: 3,
        lifecycle_payload_hash: mocks.service.payloadHash(payload),
      }),
    );

    await expect(
      mocks.service.ingest(payload, { provider_transition_version: 3 }),
    ).resolves.toMatchObject({
      outcome: 'duplicate',
      high_water_version: 3,
    });

    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.transitionModel.create).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('commits initial projection, immutable pending transition, and outbox together', async () => {
    const mocks = makeService();

    await expect(
      mocks.service.ingest(conversion(), {
        adapter: 'postback',
        provider_transition_version: 1,
        occurred_at: new Date('2026-07-17T02:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      outcome: 'applied',
      event_type: 'pending',
      transition_version: 1,
    });
    expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.revisionFence.freezeMatchingInSession).toHaveBeenCalledWith(
      new Date('2026-07-17T01:00:00.000Z'),
      mocks.session,
    );
    expect(mocks.transitionModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          transition_id: 'conversion:involve:publisher-th:9001:transition:v1',
          event_type: 'pending',
          transition_version: 1,
        }),
      ],
      { session: mocks.session },
    );
    expect(mocks.outboxModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          source_type: 'affiliate_conversion',
          source_event_id: 'conversion:involve:publisher-th:9001:transition:v1',
          event_type: 'pending',
        }),
      ],
      { session: mocks.session },
    );
  });

  it('adopts a legacy Involve row by raw conversion id instead of inserting a duplicate projection', async () => {
    const legacy = {
      _id: conversionObjectId,
      ...conversion(),
      source: 'involve',
      provider_conversion_id: undefined,
      provider_account: undefined,
      lifecycle_transition_version: undefined,
    };
    const mocks = makeService();
    mocks.conversionModel.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacy);

    await expect(
      mocks.service.ingest(conversion(), { adapter: 'postback' }),
    ).resolves.toMatchObject({ outcome: 'applied', transition_version: 1 });
    expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: conversionObjectId,
        $or: expect.arrayContaining([
          { lifecycle_transition_version: { $exists: false } },
        ]),
      }),
      expect.anything(),
      expect.objectContaining({ upsert: false, session: mocks.session }),
    );
  });

  it('treats the exact current payload as a duplicate with no event', async () => {
    const payload = conversion({ conversion_status: 'approved' });
    const mocks = makeService(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 2,
      }),
    );
    const hash = mocks.service.payloadHash(payload);
    mocks.conversionModel.findOne.mockResolvedValue(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 2,
        lifecycle_payload_hash: hash,
      }),
    );

    await expect(
      mocks.service.ingest(payload, { provider_transition_version: 2 }),
    ).resolves.toMatchObject({ outcome: 'duplicate' });
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.transitionModel.create).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('advances an explicit higher provider version even when its payload is unchanged', async () => {
    const payload = conversion({ conversion_status: 'approved' });
    const mocks = makeService();
    const hash = mocks.service.payloadHash(payload);
    mocks.conversionModel.findOne.mockResolvedValue(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 1,
        lifecycle_payload_hash: hash,
      }),
    );

    await expect(
      mocks.service.ingest(payload, { provider_transition_version: 3 }),
    ).resolves.toMatchObject({
      outcome: 'applied',
      transition_version: 3,
      high_water_version: 3,
    });
    expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle_transition_version: 1 }),
      expect.objectContaining({
        $set: expect.objectContaining({ lifecycle_transition_version: 3 }),
      }),
      expect.objectContaining({ session: mocks.session }),
    );
  });

  it('rejects a delayed changed version below an unchanged explicit high-water mark', async () => {
    const accepted = conversion({ conversion_status: 'approved' });
    const mocks = makeService();
    mocks.conversionModel.findOne.mockResolvedValue(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 3,
        lifecycle_payload_hash: mocks.service.payloadHash(accepted),
      }),
    );

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'rejected' }), {
        provider_transition_version: 2,
      }),
    ).resolves.toMatchObject({ outcome: 'stale', high_water_version: 3 });
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('quarantines a changed payload that reuses the current provider version', async () => {
    const mocks = makeService(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 3,
      }),
    );

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'rejected' }), {
        provider_transition_version: 3,
      }),
    ).resolves.toMatchObject({
      outcome: 'quarantined',
      high_water_version: 3,
    });
    expect(mocks.quarantineModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          reason: 'provider_version_payload_conflict',
        }),
      }),
      expect.objectContaining({ session: mocks.session }),
    );
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('ignores a stale out-of-order version and preserves the high-water projection', async () => {
    const mocks = makeService(
      current({
        conversion_status: 'rejected',
        lifecycle_transition_version: 3,
      }),
    );

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'approved' }), {
        provider_transition_version: 2,
      }),
    ).resolves.toMatchObject({ outcome: 'stale', high_water_version: 3 });
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('quarantines status-order ambiguity instead of guessing or mutating', async () => {
    const mocks = makeService(current());

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'approved' }), {
        adapter: 'postback',
      }),
    ).resolves.toMatchObject({ outcome: 'quarantined' });
    expect(mocks.quarantineModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ ambiguity_key: expect.any(String) }),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          reason: 'provider_order_ambiguous',
        }),
      }),
      expect.objectContaining({ upsert: true, session: mocks.session }),
    );
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('preserves the first immutable purchase time when a later status payload omits it', async () => {
    const purchaseTime = new Date('2026-07-17T01:00:00.000Z');
    const mocks = makeService(
      current({
        datetime_conversion: purchaseTime,
        conversion_status: 'pending',
        lifecycle_transition_version: 1,
      }),
    );

    await expect(
      mocks.service.ingest(
        conversion({
          datetime_conversion: undefined,
          conversion_status: 'approved',
        }),
        { provider_transition_version: 2 },
      ),
    ).resolves.toMatchObject({ outcome: 'applied', event_type: 'approved' });
    expect(mocks.transitionModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          current: expect.objectContaining({
            datetime_conversion: purchaseTime,
          }),
        }),
      ],
      { session: mocks.session },
    );
  });

  it('quarantines an attempted purchase-time change before projection or outbox', async () => {
    const mocks = makeService(
      current({
        datetime_conversion: new Date('2026-07-17T01:00:00.000Z'),
        lifecycle_transition_version: 1,
      }),
    );

    await expect(
      mocks.service.ingest(
        conversion({
          datetime_conversion: new Date('2026-08-17T01:00:00.000Z'),
          conversion_status: 'approved',
        }),
        { provider_transition_version: 2 },
      ),
    ).resolves.toMatchObject({ outcome: 'quarantined' });
    expect(mocks.quarantineModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          reason: 'immutable_datetime_conversion_conflict',
        }),
      }),
      expect.objectContaining({ session: mocks.session }),
    );
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('quarantines an initial conversion without immutable purchase time instead of using epoch zero', async () => {
    const mocks = makeService();
    await expect(
      mocks.service.ingest(conversion({ datetime_conversion: undefined }), {
        provider_transition_version: 1,
      }),
    ).resolves.toMatchObject({ outcome: 'quarantined' });
    expect(mocks.quarantineModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          reason: 'missing_immutable_datetime_conversion',
        }),
      }),
      expect.anything(),
    );
    expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('aborts before transition/outbox when the projection CAS loses a race', async () => {
    const mocks = makeService(
      current({
        conversion_status: 'pending',
        lifecycle_transition_version: 1,
      }),
    );
    mocks.conversionModel.findOneAndUpdate.mockResolvedValue(null);

    await expect(
      mocks.service.ingest(conversion({ conversion_status: 'approved' }), {
        provider_transition_version: 2,
      }),
    ).rejects.toThrow('projection CAS');
    expect(mocks.transitionModel.create).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it.each([
    ['approved', 'pending', 'approved', 2],
    ['reversed', 'approved', 'rejected', 3],
    ['requalified', 'rejected', 'approved', 4],
  ])(
    'emits distinct %s transition identity',
    async (eventType, fromStatus, toStatus, version) => {
      const mocks = makeService(
        current({
          conversion_status: fromStatus,
          lifecycle_transition_version: version - 1,
        }),
      );

      await expect(
        mocks.service.ingest(conversion({ conversion_status: toStatus }), {
          provider_transition_version: version,
        }),
      ).resolves.toMatchObject({
        event_type: eventType,
        source_event_id: `conversion:involve:publisher-th:9001:transition:v${version}`,
      });
    },
  );

  it('emits a correction when an approved amount changes at a newer version', async () => {
    const mocks = makeService(
      current({
        conversion_status: 'approved',
        lifecycle_transition_version: 5,
        sale_amount: 100,
      }),
    );

    await expect(
      mocks.service.ingest(
        conversion({ conversion_status: 'approved', sale_amount: 125 }),
        { provider_transition_version: 6 },
      ),
    ).resolves.toMatchObject({ event_type: 'correction' });
    expect(mocks.transitionModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          previous: expect.objectContaining({ sale_amount: 100 }),
          current: expect.objectContaining({ sale_amount: 125 }),
        }),
      ],
      { session: mocks.session },
    );
  });

  it('stores a synthetic quest conversion without emitting a quest event', async () => {
    const mocks = makeService();

    await expect(
      mocks.service.ingest(
        conversion({
          quest_synthetic_reward: true,
          conversion_status: 'approved',
        }),
        { provider_transition_version: 1 },
      ),
    ).resolves.toMatchObject({ outcome: 'excluded_synthetic' });
    expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });
});
