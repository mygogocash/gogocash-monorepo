import { ServiceUnavailableException } from '@nestjs/common';
import { Types } from 'mongoose';

import { AccountRegistrationService } from './account-registration.service';

describe('AccountRegistrationService', () => {
  const originalEnv = process.env;
  const refereeId = new Types.ObjectId();
  const referrerId = new Types.ObjectId();

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeService(
    options: {
      existing?: Record<string, unknown> | null;
      referrer?: Record<string, unknown> | null;
      topologyError?: Error;
      pointWriteError?: Error;
    } = {},
  ) {
    const session = {
      withTransaction: jest.fn(async (operation: () => Promise<void>) =>
        operation(),
      ),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = { startSession: jest.fn().mockResolvedValue(session) };
    const userModel = {
      findOne: jest.fn().mockImplementation(async (filter) => {
        if (filter.id_firebase) return options.existing ?? null;
        return options.referrer === undefined
          ? { _id: referrerId, disabled: false }
          : options.referrer;
      }),
      create: jest.fn().mockResolvedValue([
        {
          _id: refereeId,
          id_firebase: 'firebase-new',
          referred_by: referrerId.toHexString(),
        },
      ]),
      findOneAndUpdate: jest.fn(),
    };
    const pointModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      updateOne: options.pointWriteError
        ? jest.fn().mockRejectedValue(options.pointWriteError)
        : jest.fn().mockResolvedValue({ upsertedCount: 1 }),
      findOne: jest.fn().mockResolvedValue({
        user_id: referrerId,
        referral_id: refereeId,
        conversion_id: 0,
        point: 50,
        type: 'add',
        action: 'referral',
        idempotency_key: `referral:base:v1:referrer:${referrerId.toHexString()}:referee:${refereeId.toHexString()}`,
      }),
    };
    const accountTransitionModel = {
      create: jest.fn().mockResolvedValue([]),
    };
    const outboxModel = { create: jest.fn().mockResolvedValue([]) };
    const topology = {
      enabled: process.env.QUEST_TASK_V2_ENABLED === 'true',
      durableJournalRequired: jest
        .fn()
        .mockResolvedValue(process.env.QUEST_TASK_V2_ENABLED === 'true'),
      assertReady: options.topologyError
        ? jest.fn().mockRejectedValue(options.topologyError)
        : jest.fn().mockResolvedValue({ supported: true }),
    };
    const revisionFence = {
      freezeMatchingInSession: jest.fn().mockResolvedValue(1),
    };
    const service = new AccountRegistrationService(
      connection as never,
      userModel as never,
      pointModel as never,
      accountTransitionModel as never,
      outboxModel as never,
      topology as never,
      revisionFence as never,
    );
    return {
      service,
      session,
      connection,
      userModel,
      pointModel,
      accountTransitionModel,
      outboxModel,
      topology,
      revisionFence,
    };
  }

  const input = () => ({
    source: 'firebase:google.com',
    user: {
      _id: refereeId,
      id_firebase: 'firebase-new',
      email: 'new@example.com',
      provider: 'google.com',
    },
    referral_id: referrerId.toHexString(),
    occurred_at: new Date('2026-07-17T08:00:00.000Z'),
  });

  it('fails topology readiness before user/referral mutation when task-v2 is enabled', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const unavailable = new ServiceUnavailableException('standalone');
    const mocks = makeService({ topologyError: unavailable });

    await expect(mocks.service.registerVerified(input())).rejects.toBe(
      unavailable,
    );
    expect(mocks.connection.startSession).not.toHaveBeenCalled();
    expect(mocks.userModel.create).not.toHaveBeenCalled();
    expect(mocks.pointModel.updateOne).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it('atomically creates user, immutable attribution, unchanged base referral, transition, and outbox', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const mocks = makeService();

    await expect(
      mocks.service.registerVerified(input()),
    ).resolves.toMatchObject({
      created: true,
      source_event_id: `account:${refereeId.toHexString()}:created:v1`,
    });

    expect(mocks.session.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.userModel.create).toHaveBeenCalledWith(
      [expect.objectContaining({ referred_by: referrerId.toHexString() })],
      expect.objectContaining({ session: mocks.session }),
    );
    expect(mocks.pointModel.updateOne).toHaveBeenCalledWith(
      {
        idempotency_key: `referral:base:v1:referrer:${referrerId.toHexString()}:referee:${refereeId.toHexString()}`,
      },
      {
        $setOnInsert: expect.objectContaining({
          point: 50,
          type: 'add',
          action: 'referral',
        }),
      },
      expect.objectContaining({ upsert: true, session: mocks.session }),
    );
    expect(mocks.accountTransitionModel.create).toHaveBeenCalledTimes(1);
    expect(mocks.revisionFence.freezeMatchingInSession).toHaveBeenCalledWith(
      input().occurred_at,
      mocks.session,
    );
    expect(mocks.outboxModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          source_type: 'account_registration',
          source_event_id: `account:${refereeId.toHexString()}:created:v1`,
          status: 'pending',
        }),
      ],
      { session: mocks.session },
    );
  });

  it('journals a new account while evaluation is disabled after task-v2 preparation', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const mocks = makeService();
    mocks.topology.enabled = false;
    mocks.topology.durableJournalRequired.mockResolvedValue(true);

    await expect(
      mocks.service.registerVerified(input()),
    ).resolves.toMatchObject({
      created: true,
      source_event_id: `account:${refereeId.toHexString()}:created:v1`,
    });

    expect(mocks.topology.assertReady).toHaveBeenCalledTimes(1);
    expect(mocks.session.withTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.accountTransitionModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          transition_id: `account:${refereeId.toHexString()}:created:v1`,
          version: 1,
        }),
      ],
      { session: mocks.session },
    );
    expect(mocks.outboxModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          source_event_id: `account:${refereeId.toHexString()}:created:v1`,
          event_type: 'account_created',
          status: 'pending',
          attempts: 0,
        }),
      ],
      { session: mocks.session },
    );
  });

  it.each([
    ['enabled task-v2 registration', 'true', true],
    ['legacy-compatible registration', 'false', false],
  ])(
    'canonicalizes a full-name country for %s',
    async (_label, enabled, expectsTransaction) => {
      process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: enabled };
      const mocks = makeService();

      await expect(
        mocks.service.registerVerified({
          ...input(),
          user: { ...input().user, country: 'Thailand' },
        }),
      ).resolves.toMatchObject({ created: true });

      if (expectsTransaction) {
        expect(mocks.userModel.create).toHaveBeenCalledWith(
          [expect.objectContaining({ country: 'TH' })],
          expect.anything(),
        );
      } else {
        expect(mocks.userModel.findOneAndUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ country: 'TH' }),
          expect.anything(),
        );
      }
    },
  );

  it('returns an existing account as login and emits nothing', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const existing = { _id: refereeId, id_firebase: 'firebase-new' };
    const mocks = makeService({ existing });

    await expect(mocks.service.registerVerified(input())).resolves.toEqual({
      user: existing,
      created: false,
    });
    expect(mocks.userModel.create).not.toHaveBeenCalled();
    expect(mocks.pointModel.updateOne).not.toHaveBeenCalled();
    expect(mocks.accountTransitionModel.create).not.toHaveBeenCalled();
    expect(mocks.outboxModel.create).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid', 'not-an-object-id'],
    ['self', refereeId.toHexString()],
  ])(
    'ignores %s referral without blocking account creation',
    async (_label, referralId) => {
      process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
      const mocks = makeService();

      await expect(
        mocks.service.registerVerified({ ...input(), referral_id: referralId }),
      ).resolves.toMatchObject({ created: true });
      expect(mocks.userModel.create).toHaveBeenCalledWith(
        [expect.not.objectContaining({ referred_by: expect.anything() })],
        expect.anything(),
      );
      expect(mocks.pointModel.updateOne).not.toHaveBeenCalled();
      expect(mocks.outboxModel.create).toHaveBeenCalledTimes(1);
    },
  );

  it('ignores a missing referrer and still emits canonical account-created', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const mocks = makeService({ referrer: null });

    await expect(
      mocks.service.registerVerified(input()),
    ).resolves.toMatchObject({
      created: true,
      source_event_id: `account:${refereeId.toHexString()}:created:v1`,
    });
    expect(mocks.pointModel.updateOne).not.toHaveBeenCalled();
  });

  it('retries atomically without the base row when its write fails, preserving signup for reconciliation', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const mocks = makeService({
      pointWriteError: new Error('point unavailable'),
    });

    await expect(
      mocks.service.registerVerified(input()),
    ).resolves.toMatchObject({
      created: true,
      referral_reconciliation_required: true,
    });
    expect(mocks.connection.startSession).toHaveBeenCalledTimes(2);
    expect(mocks.outboxModel.create).toHaveBeenLastCalledWith(
      [
        expect.objectContaining({
          payload: expect.objectContaining({
            base_referral_reconciliation_required: true,
          }),
        }),
      ],
      expect.anything(),
    );
  });
});
