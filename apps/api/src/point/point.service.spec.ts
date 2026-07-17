import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { buildApprovedUserConversionsFilter } from 'src/withdraw/conversion-user-id.util';
import { PointService } from './point.service';
import { User } from 'src/user/schemas/user.schema';
import { Point } from './schemas/point.schema';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Quest } from './schemas/quest.schema';
import { SocialReward } from './schemas/social-reward.schema';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import * as helper from 'src/utils/helper';
import { QuestMediaWriteService } from './quest-media-write.service';
import { QUEST_TASK_STATE_INSPECTOR } from './quest-task.contract';
import { legacyQuestPayoutConfigChecksum } from 'src/tasks/legacy-reward-manifest';
import { MembershipTier } from 'src/admin/membership/schemas/membership-tier.schema';

// convertToTHB hits a live FX HTTP endpoint; mock at the module seam so the
// suite stays Fast/Repeatable and never touches the network.
jest.mock('src/utils/helper', () => ({
  convertToTHB: jest.fn(),
}));

const convertToTHB = helper.convertToTHB as jest.Mock;

/**
 * A chainable mongoose-query stub: every chaining method returns `this`,
 * and the terminal awaited value resolves to `result`. Covers .exec(),
 * .lean(), .populate(), .select(), .sort() used across PointService.
 */
function makeQuery(result: unknown) {
  const q: Record<string, jest.Mock> = {};
  for (const m of ['exec', 'lean', 'populate', 'select', 'sort']) {
    q[m] = jest.fn(() => q);
  }
  q.exec = jest.fn().mockResolvedValue(result);
  q.lean = jest.fn().mockResolvedValue(result);
  // Make the object itself awaitable (mongoose queries are thenables).
  (q as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return q;
}

function reconciledLegacySocialQuest(_id: Types.ObjectId) {
  const quest = {
    _id,
    reward_model: 'legacy_v1',
    legacy_payout_reconciliation_status: 'ready',
    legacy_payout_reconciliation_version: 1,
    facebook_page: 'https://facebook.example/gogocash',
    facebook_post: 'https://facebook.example/gogocash/posts/frozen',
    line: 'https://line.example/gogocash',
    legacy_payout_config_checksum: '',
  };
  quest.legacy_payout_config_checksum = legacyQuestPayoutConfigChecksum(quest);
  return quest;
}

describe('PointService', () => {
  let service: PointService;

  let userModel: Record<string, jest.Mock>;
  let pointModel: Record<string, jest.Mock> & jest.Mock;
  let conversionModel: Record<string, jest.Mock>;
  let offerModel: Record<string, jest.Mock>;
  let questModel: Record<string, jest.Mock>;
  let socialRewardModel: Record<string, jest.Mock>;
  let deeplinkModel: Record<string, jest.Mock>;
  let membershipTierModel: Record<string, jest.Mock>;
  let analytics: { capture: jest.Mock };
  let questMediaWrite: { execute: jest.Mock };
  let questTaskStateInspector: { withTaskConfigEditFence: jest.Mock };

  // Captures documents constructed via `new this.pointModel({...})` so we can
  // assert what gets persisted by addPointsToUser.
  let constructedPointDocs: Array<{
    data: Record<string, unknown>;
    save: jest.Mock;
  }>;

  beforeEach(async () => {
    constructedPointDocs = [];

    // pointModel must be BOTH a constructor (new this.pointModel) and a holder
    // of static query methods (findOne, aggregate, find).
    const pointModelFn = jest.fn().mockImplementation((data) => {
      const doc = {
        data,
        save: jest.fn().mockResolvedValue({ _id: 'saved-point', ...data }),
      };
      constructedPointDocs.push(doc);
      return doc;
    }) as unknown as Record<string, jest.Mock> & jest.Mock;
    pointModelFn.findOne = jest.fn();
    pointModelFn.findOneAndUpdate = jest.fn();
    pointModelFn.aggregate = jest.fn();
    pointModelFn.find = jest.fn();
    pointModel = pointModelFn;

    userModel = { findOne: jest.fn() };
    conversionModel = { aggregate: jest.fn(), find: jest.fn() };
    offerModel = {
      find: jest.fn(),
      updateMany: jest.fn(),
      bulkWrite: jest.fn(),
    };
    questModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      updateOne: jest.fn(),
      findById: jest.fn(),
    };
    socialRewardModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn(),
      create: jest.fn(),
    };
    deeplinkModel = { aggregate: jest.fn().mockResolvedValue([]) };
    membershipTierModel = { find: jest.fn().mockReturnValue(makeQuery([])) };
    analytics = { capture: jest.fn().mockResolvedValue(undefined) };
    questMediaWrite = { execute: jest.fn() };
    questTaskStateInspector = {
      withTaskConfigEditFence: jest.fn(async (_questId, operation) =>
        operation(
          {
            has_outbox: false,
            has_progress: false,
            has_award: false,
          },
          undefined as never,
        ),
      ),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PointService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(Point.name), useValue: pointModel },
        { provide: getModelToken(Conversion.name), useValue: conversionModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: getModelToken(Quest.name), useValue: questModel },
        {
          provide: getModelToken(SocialReward.name),
          useValue: socialRewardModel,
        },
        { provide: getModelToken(Deeplink.name), useValue: deeplinkModel },
        {
          provide: getModelToken(MembershipTier.name),
          useValue: membershipTierModel,
        },
        { provide: AnalyticsService, useValue: analytics },
        { provide: QuestMediaWriteService, useValue: questMediaWrite },
        {
          provide: QUEST_TASK_STATE_INSPECTOR,
          useValue: questTaskStateInspector,
        },
      ],
    }).compile();

    service = moduleRef.get<PointService>(PointService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('point scaffold mutations > given request DTOs > then they do not print payloads to stdout', () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    try {
      service.create({ point: 10, user_id: 'user-1' } as never);
      service.update(1, { point: 20 } as never);

      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  describe('addPointsToUser', () => {
    const userId = new Types.ObjectId().toHexString();

    // Idempotency on money: granting points for a (user, conversion, action)
    // tuple that was already credited must NOT create a second Point doc, or
    // users would be double-paid on a retried conversion-approval webhook. The
    // method is idempotent and returns the EXISTING grant, so callers get a
    // consistent Point whether it was just created or already present (the
    // Promise<Point> contract must not resolve to undefined on the dedup path).
    it('addPointsToUser > given a matching grant already exists > then no new point is persisted, analytics is not fired, and the existing grant is returned', async () => {
      const existing = { _id: 'existing', point: 100, conversion_id: 555 };
      pointModel.findOne.mockReturnValue(makeQuery(existing));

      const result = await service.addPointsToUser(userId, 100, 555);

      expect(constructedPointDocs).toHaveLength(0);
      expect(analytics.capture).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    // The happy path must persist exactly the requested point amount and the
    // conversion id, and emit the points_granted analytics event.
    it('addPointsToUser > given no existing grant > then it persists the points and captures analytics', async () => {
      pointModel.findOne.mockReturnValue(makeQuery(null));

      const result = await service.addPointsToUser(userId, 250, 777);

      expect(constructedPointDocs).toHaveLength(1);
      expect(constructedPointDocs[0].data).toMatchObject({
        point: 250,
        conversion_id: 777,
        type: 'add',
        action: 'purchase',
      });
      expect(constructedPointDocs[0].save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ point: 250, conversion_id: 777 });

      expect(analytics.capture).toHaveBeenCalledTimes(1);
      const [event, , props] = analytics.capture.mock.calls[0];
      expect(event).toBe('points_granted');
      expect(props).toMatchObject({ points: 250, conversion_id: 777 });
    });

    // The dedup lookup and the stored doc must default the action to 'purchase'
    // when no action is supplied — otherwise the idempotency key drifts.
    it("addPointsToUser > given no action argument > then it defaults action to 'purchase' in both the dedup query and the stored doc", async () => {
      pointModel.findOne.mockReturnValue(makeQuery(null));

      await service.addPointsToUser(userId, 50, 1);

      expect(pointModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'purchase', type: 'add' }),
      );
      expect(constructedPointDocs[0].data).toMatchObject({
        action: 'purchase',
      });
    });

    it('addPointsToUser > given an explicit action > then the dedup query uses that action', async () => {
      pointModel.findOne.mockReturnValue(makeQuery(null));

      await service.addPointsToUser(userId, 50, 2, 'referral');

      expect(pointModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'referral' }),
      );
      expect(constructedPointDocs[0].data).toMatchObject({
        action: 'referral',
      });
    });

    it('addPointsToUser > given an idempotency key > then it atomically creates or returns one durable grant by key', async () => {
      const durable = {
        _id: 'task-point',
        idempotency_key: 'quest:q1:task:t1:user:u1:epoch:0',
        point: 75,
        user_id: new Types.ObjectId(userId),
        conversion_id: 991,
        type: 'add',
        action: 'quest_task_v2',
      };
      pointModel.findOneAndUpdate.mockReturnValue(makeQuery(durable));
      pointModel.findOne.mockReturnValue(makeQuery(null));

      await expect(
        service.addPointsToUser(
          userId,
          75,
          991,
          'quest_task_v2',
          durable.idempotency_key,
        ),
      ).resolves.toBe(durable);

      expect(pointModel.findOneAndUpdate).toHaveBeenCalledWith(
        { idempotency_key: durable.idempotency_key },
        {
          $setOnInsert: {
            user_id: new Types.ObjectId(userId),
            point: 75,
            conversion_id: 991,
            type: 'add',
            action: 'quest_task_v2',
            idempotency_key: durable.idempotency_key,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      expect(constructedPointDocs).toHaveLength(0);
      expect(pointModel.findOne).not.toHaveBeenCalled();
    });

    it('addPointsToUser > given a blank idempotency key > then it rejects before writing', async () => {
      pointModel.findOne.mockReturnValue(makeQuery(null));
      await expect(
        service.addPointsToUser(userId, 75, 991, 'quest_task_v2', '   '),
      ).rejects.toMatchObject({ status: 400 });
      expect(pointModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('addPointsToUser > given an upsert loses a unique-key race > then it returns the winning durable grant', async () => {
      const key = 'quest:q1:task:t1:user:u1:epoch:0';
      const winner = {
        _id: 'winner',
        idempotency_key: key,
        point: 75,
        user_id: new Types.ObjectId(userId),
        conversion_id: 991,
        type: 'add',
        action: 'quest_task_v2',
      };
      pointModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });
      pointModel.findOne.mockReturnValue(makeQuery(winner));

      await expect(
        service.addPointsToUser(userId, 75, 991, 'quest_task_v2', key),
      ).resolves.toBe(winner);
      expect(pointModel.findOne).toHaveBeenCalledWith({ idempotency_key: key });
      expect(constructedPointDocs).toHaveLength(0);
    });

    it.each([
      ['user', { user_id: new Types.ObjectId() }],
      ['point amount', { point: 76 }],
      ['conversion', { conversion_id: 992 }],
      ['action', { action: 'referral' }],
    ])(
      'addPointsToUser > given the same idempotency key with a different %s effect > then it fails closed',
      async (_label, conflictingFields) => {
        const key = 'quest:q1:task:t1:user:u1:epoch:0';
        const existing = {
          _id: 'existing-keyed-point',
          idempotency_key: key,
          point: 75,
          user_id: new Types.ObjectId(userId),
          conversion_id: 991,
          type: 'add',
          action: 'quest_task_v2',
          ...conflictingFields,
        };
        pointModel.findOneAndUpdate.mockReturnValue(makeQuery(existing));

        await expect(
          service.addPointsToUser(userId, 75, 991, 'quest_task_v2', key),
        ).rejects.toMatchObject({
          status: 409,
          response: expect.objectContaining({
            code: 'POINT_IDEMPOTENCY_KEY_CONFLICT',
          }),
        });
      },
    );

    it('addPointsToUser > given a unique-key race winner with different semantics > then it fails closed', async () => {
      const key = 'quest:q1:task:t1:user:u1:epoch:0';
      pointModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });
      pointModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'wrong-winner',
          idempotency_key: key,
          point: 999,
          user_id: new Types.ObjectId(userId),
          conversion_id: 991,
          type: 'add',
          action: 'quest_task_v2',
        }),
      );

      await expect(
        service.addPointsToUser(userId, 75, 991, 'quest_task_v2', key),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          code: 'POINT_IDEMPOTENCY_KEY_CONFLICT',
        }),
      });
    });
  });

  describe('getPoint', () => {
    const id = new Types.ObjectId().toHexString();

    it('getPoint > given an unknown user > then it returns a zero balance', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.getPoint(id)).resolves.toEqual({ point: 0 });
      expect(pointModel.aggregate).not.toHaveBeenCalled();
    });

    // Balance correctness: net = sum(add) - sum(remove).
    it('getPoint > given add and remove totals > then it returns added minus removed', async () => {
      userModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      pointModel.aggregate
        .mockResolvedValueOnce([{ totalPoints: 300 }]) // add
        .mockResolvedValueOnce([{ totalPoints: 120 }]); // remove

      await expect(service.getPoint(id)).resolves.toEqual({ point: 180 });
    });

    // A balance must never display as negative even if removals exceed adds
    // (e.g. a manual adjustment); the floor protects the wallet UI.
    it('getPoint > given removals exceed additions > then the balance floors at 0', async () => {
      userModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      pointModel.aggregate
        .mockResolvedValueOnce([{ totalPoints: 50 }])
        .mockResolvedValueOnce([{ totalPoints: 200 }]);

      await expect(service.getPoint(id)).resolves.toEqual({ point: 0 });
    });

    it('getPoint > given no point documents at all > then it returns a zero balance', async () => {
      userModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      pointModel.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await expect(service.getPoint(id)).resolves.toEqual({ point: 0 });
    });
  });

  describe('getListReferral', () => {
    const id = new Types.ObjectId().toHexString();

    it('getListReferral > given an unknown user > then it returns an empty list without querying points', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(service.getListReferral(id)).resolves.toEqual([]);
      expect(pointModel.find).not.toHaveBeenCalled();
    });

    it('getListReferral > given a known user > then it queries referral points for that user', async () => {
      const userObjId = new Types.ObjectId();
      userModel.findOne.mockResolvedValue({ _id: userObjId });
      const referrals = [{ _id: 'r1' }];
      pointModel.find.mockReturnValue(makeQuery(referrals));

      await expect(service.getListReferral(id)).resolves.toBe(referrals);
      expect(pointModel.find).toHaveBeenCalledWith({
        user_id: userObjId,
        action: 'referral',
      });
    });
  });

  describe('updateQuestTasks', () => {
    const questId = new Types.ObjectId().toHexString();
    const offerObjectId = new Types.ObjectId();

    const config = (tasks: Array<Record<string, unknown>>, revision = 0) =>
      ({
        reward_model: 'task_v2',
        expected_config_revision: revision,
        timezone: 'Asia/Bangkok',
        audience: { kind: 'all' },
        reward_caps: {
          max_awards_per_user: 1,
          max_referrals_per_user: null,
        },
        tasks,
      }) as any;

    const futureQuest = (overrides: Record<string, unknown> = {}) => ({
      _id: new Types.ObjectId(questId),
      reward_model: 'task_v2',
      config_revision: 0,
      start_date: new Date('2099-06-01T00:00:00.000Z'),
      end_date: new Date('2099-06-30T00:00:00.000Z'),
      timezone: 'Asia/Bangkok',
      audience: { kind: 'all' },
      reward_caps: {
        max_awards_per_user: 1,
        max_referrals_per_user: null,
      },
      tasks: [],
      ...overrides,
    });

    const referralTask = (overrides: Record<string, unknown> = {}) => ({
      task_type: 'friend_referral',
      completion_rule: 'account_created',
      points: 50,
      enabled: true,
      wording_en: 'Invite a friend',
      wording_th: 'ชวนเพื่อน',
      notes: '',
      ...overrides,
    });

    it.each([
      referralTask(),
      {
        task_type: 'spend_target',
        spend_scope: 'any_shop_via_ggc',
        target_thb_minor: 100_000,
        points: 50,
        enabled: true,
        wording_en: 'Spend THB 1,000',
        wording_th: 'ใช้จ่าย 1,000 บาท',
        notes: '',
      },
    ])(
      'rejects non-brand task type $task_type under legacy_v1',
      async (task) => {
        questModel.findById.mockReturnValue(
          makeQuery(futureQuest({ reward_model: 'legacy_v1' })),
        );

        await expect(
          service.updateQuestTasks(questId, {
            ...config([task]),
            reward_model: 'legacy_v1',
          }),
        ).rejects.toMatchObject({
          status: 400,
          response: expect.stringContaining('legacy_v1'),
        });
        expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );

    it('rejects a membership audience under legacy_v1 with an actionable version error', async () => {
      const tierId = new Types.ObjectId();
      questModel.findById.mockReturnValue(
        makeQuery(
          futureQuest({
            reward_model: 'legacy_v1',
            audience: { kind: 'all' },
            reward_caps: {
              max_awards_per_user: null,
              max_referrals_per_user: null,
            },
          }),
        ),
      );

      await expect(
        service.updateQuestTasks(questId, {
          ...config([]),
          reward_model: 'legacy_v1',
          audience: {
            kind: 'membership_tiers',
            tier_ids: [tierId.toHexString()],
          },
          reward_caps: {
            max_awards_per_user: null,
            max_referrals_per_user: null,
          },
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'QUEST_LEGACY_ADVANCED_CONFIG_UNSUPPORTED',
          message: expect.stringContaining('task_v2'),
        }),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each(['max_awards_per_user', 'max_referrals_per_user'] as const)(
      'rejects non-null %s under legacy_v1 instead of silently upgrading',
      async (field) => {
        questModel.findById.mockReturnValue(
          makeQuery(
            futureQuest({
              reward_model: 'legacy_v1',
              audience: { kind: 'all' },
              reward_caps: {
                max_awards_per_user: null,
                max_referrals_per_user: null,
              },
            }),
          ),
        );

        await expect(
          service.updateQuestTasks(questId, {
            ...config([]),
            reward_model: 'legacy_v1',
            audience: { kind: 'all' },
            reward_caps: {
              max_awards_per_user: null,
              max_referrals_per_user: null,
              [field]: 1,
            },
          }),
        ).rejects.toMatchObject({
          status: 400,
          response: expect.objectContaining({
            code: 'QUEST_LEGACY_ADVANCED_CONFIG_UNSUPPORTED',
            message: expect.stringContaining('task_v2'),
          }),
        });
        expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );

    it('keeps the default all-audience/null-cap legacy_v1 contract compatible', async () => {
      const legacyQuest = futureQuest({
        reward_model: 'legacy_v1',
        audience: { kind: 'all' },
        reward_caps: {
          max_awards_per_user: null,
          max_referrals_per_user: null,
        },
      });
      questModel.findById.mockReturnValue(makeQuery(legacyQuest));

      await expect(
        service.updateQuestTasks(questId, {
          ...config([]),
          reward_model: 'legacy_v1',
          audience: { kind: 'all' },
          reward_caps: {
            max_awards_per_user: null,
            max_referrals_per_user: null,
          },
        }),
      ).resolves.toMatchObject({ reward_model: 'legacy_v1' });
    });

    it('rejects legacy task or eligibility economics changes after manifest resolution starts', async () => {
      questModel.findById.mockReturnValue(
        makeQuery(
          futureQuest({
            reward_model: 'legacy_v1',
            legacy_payout_resolution_started_at: new Date(
              '2026-07-01T00:00:00.000Z',
            ),
          }),
        ),
      );

      await expect(
        service.updateQuestTasks(questId, {
          ...config([]),
          reward_model: 'legacy_v1',
          reward_caps: {
            max_awards_per_user: 2,
            max_referrals_per_user: null,
          },
        }),
      ).rejects.toMatchObject({
        status: 409,
        message: expect.stringContaining('frozen'),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a task with no customer-visible wording', async () => {
      questModel.findById.mockReturnValue(makeQuery(futureQuest()));

      await expect(
        service.updateQuestTasks(
          questId,
          config([
            referralTask({
              wording: '',
              wording_en: '',
              wording_th: '',
            }),
          ]),
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.stringContaining('wording'),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('resolves brand provider identifiers from Offer and assigns a server task key', async () => {
      const quest = futureQuest();
      questModel.findById.mockReturnValue(makeQuery(quest));
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: offerObjectId,
            offer_id: 101,
            merchant_id: 1001,
            status: 'approved',
            disabled: false,
          },
        ]),
      );
      questModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ ...quest, config_revision: 1 }),
      );

      await service.updateQuestTasks(
        questId,
        config([
          {
            task_type: 'brand_purchase',
            offer: offerObjectId.toHexString(),
            points: 50,
            enabled: true,
            wording_en: ' Make an order ',
          },
        ]),
      );

      const [filter, update] = questModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual(
        expect.objectContaining({
          _id: new Types.ObjectId(questId),
          config_revision: 0,
          start_date: { $gt: expect.any(Date) },
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
          ],
        }),
      );
      expect(update.$set.tasks[0]).toEqual(
        expect.objectContaining({
          task_key: expect.stringMatching(/^task_[A-Za-z0-9_-]{12,80}$/),
          task_type: 'brand_purchase',
          offer: offerObjectId,
          offer_id: 101,
          merchant_id: 1001,
          points: 50,
          extra_point: 50,
          sort_order: 0,
          wording: 'Make an order',
          wording_en: 'Make an order',
        }),
      );
      expect(update.$inc).toEqual({ config_revision: 1 });
      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).toHaveBeenCalledWith(questId, expect.any(Function));
    });

    it('preserves an existing server task key across a wording-only save', async () => {
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({ tasks: [existingTask] });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));

      await service.updateQuestTasks(
        questId,
        config([
          referralTask({ task_key: taskKey, wording_en: 'Invite one friend' }),
        ]),
      );

      const [, update] = questModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.tasks[0].task_key).toBe(taskKey);
    });

    it('allows a frozen wording-only edit when the unchanged brand offer is now inactive', async () => {
      const taskKey = 'task_frozen_brand_1234';
      const existingTask = {
        task_key: taskKey,
        task_type: 'brand_purchase',
        offer: offerObjectId,
        offer_id: 101,
        merchant_id: 1001,
        points: 50,
        extra_point: 50,
        sort_order: 0,
        enabled: true,
        wording: 'Buy now',
        wording_en: 'Buy now',
        wording_th: 'ซื้อเลย',
        notes: '',
      };
      const quest = futureQuest({
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        task_v2_state_frozen_at: new Date('2026-01-01T00:00:00.000Z'),
        tasks: [existingTask],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));

      await service.updateQuestTasks(
        questId,
        config([
          {
            ...existingTask,
            offer: offerObjectId.toHexString(),
            wording: 'Buy from this brand',
            wording_en: 'Buy from this brand',
            notes: 'Copy-only review',
          },
        ]),
      );

      expect(offerModel.find).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(questId), config_revision: 0 },
        expect.objectContaining({
          $set: expect.objectContaining({
            tasks: [
              expect.objectContaining({
                task_key: taskKey,
                offer: offerObjectId,
                offer_id: 101,
                merchant_id: 1001,
                wording_en: 'Buy from this brand',
              }),
            ],
          }),
        }),
        { new: true },
      );
    });

    it('revalidates and rejects a changed brand offer on a frozen quest', async () => {
      const taskKey = 'task_frozen_brand_1234';
      const replacementOfferId = new Types.ObjectId();
      const existingTask = {
        task_key: taskKey,
        task_type: 'brand_purchase',
        offer: offerObjectId,
        offer_id: 101,
        merchant_id: 1001,
        points: 50,
        extra_point: 50,
        sort_order: 0,
        enabled: true,
        wording: 'Buy now',
        wording_en: 'Buy now',
        wording_th: 'ซื้อเลย',
        notes: '',
      };
      const quest = futureQuest({
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        task_v2_state_frozen_at: new Date('2026-01-01T00:00:00.000Z'),
        tasks: [existingTask],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));
      offerModel.find.mockReturnValue(
        makeQuery([
          {
            _id: replacementOfferId,
            offer_id: 202,
            merchant_id: 2002,
            status: 'approved',
            disabled: false,
          },
        ]),
      );

      await expect(
        service.updateQuestTasks(
          questId,
          config([
            {
              ...existingTask,
              offer: replacementOfferId.toHexString(),
            },
          ]),
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          code: 'QUEST_TASK_CONFIG_FROZEN',
        }),
      });
      expect(offerModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: { $in: [replacementOfferId] },
          status: { $nin: ['pending_review', 'rejected'] },
          disabled: { $ne: true },
        }),
      );
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('returns a semantic task no-op before the inspector or revision write', async () => {
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({ tasks: [existingTask] });
      questModel.findById.mockReturnValue(makeQuery(quest));

      await expect(
        service.updateQuestTasks(
          questId,
          config([referralTask({ task_key: taskKey })]),
        ),
      ).resolves.toEqual(expect.objectContaining({ config_revision: 0 }));
      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(offerModel.bulkWrite).not.toHaveBeenCalled();
    });

    it('returns an unchanged task-v2 config without an inspector or revision write', async () => {
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({ tasks: [existingTask] });
      questModel.findById.mockReturnValue(makeQuery(quest));

      await expect(
        service.updateQuestTasks(
          questId,
          config([referralTask({ task_key: taskKey })]),
        ),
      ).resolves.toEqual(
        expect.objectContaining({ _id: quest._id, config_revision: 0 }),
      );

      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('assigns a fresh task key when pre-start task economics change', async () => {
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({ tasks: [existingTask] });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));

      await service.updateQuestTasks(
        questId,
        config([referralTask({ task_key: taskKey, points: 75 })]),
      );

      const [, update] = questModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.tasks[0].task_key).toMatch(/^task_/);
      expect(update.$set.tasks[0].task_key).not.toBe(taskKey);
    });

    it('assigns fresh task keys when global audience or cap eligibility changes', async () => {
      const tierId = new Types.ObjectId();
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({ tasks: [existingTask] });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));
      membershipTierModel.find.mockReturnValue(
        makeQuery([{ _id: tierId, is_active: true }]),
      );

      const payload = config([
        referralTask({ task_key: taskKey }),
      ]) as unknown as Record<string, unknown>;
      await service.updateQuestTasks(questId, {
        ...payload,
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tierId.toHexString()],
        },
        reward_caps: {
          max_awards_per_user: 2,
          max_referrals_per_user: 3,
        },
      } as never);

      const [, update] = questModel.findOneAndUpdate.mock.calls[0];
      expect(update.$set.tasks[0].task_key).not.toBe(taskKey);
    });

    it('normalizes, deduplicates, and sorts active membership tier ids inside the fenced transaction', async () => {
      const firstTierId = new Types.ObjectId('6942b79d7b9f8214ada6eed5');
      const secondTierId = new Types.ObjectId('5942b79d7b9f8214ada6eed5');
      const transactionSession = { id: 'task-config-session' };
      const quest = futureQuest();
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));
      membershipTierModel.find.mockReturnValue(
        makeQuery([{ _id: firstTierId }, { _id: secondTierId }]),
      );
      questTaskStateInspector.withTaskConfigEditFence.mockImplementationOnce(
        async (_id, operation) =>
          operation(
            { has_outbox: false, has_progress: false, has_award: false },
            transactionSession,
          ),
      );

      await service.updateQuestTasks(questId, {
        ...config([]),
        audience: {
          kind: 'membership_tiers',
          tier_ids: [
            firstTierId.toHexString().toUpperCase(),
            secondTierId.toHexString(),
            firstTierId.toHexString(),
          ],
        },
      });

      expect(membershipTierModel.find).toHaveBeenCalledWith(
        {
          _id: { $in: [secondTierId, firstTierId] },
          is_active: true,
        },
        { _id: 1 },
        { session: transactionSession },
      );
      expect(
        questModel.findOneAndUpdate.mock.calls[0][1].$set.audience,
      ).toEqual({
        kind: 'membership_tiers',
        tier_ids: [secondTierId.toHexString(), firstTierId.toHexString()],
      });
    });

    it('rejects a non-canonical membership tier id before entering the config fence', async () => {
      questModel.findById.mockReturnValue(makeQuery(futureQuest()));

      await expect(
        service.updateQuestTasks(questId, {
          ...config([]),
          audience: { kind: 'membership_tiers', tier_ids: ['gogopass'] },
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'QUEST_MEMBERSHIP_TIER_ID_INVALID',
        }),
      });
      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).not.toHaveBeenCalled();
      expect(membershipTierModel.find).not.toHaveBeenCalled();
    });

    it.each(['missing', 'inactive'])(
      'rejects a newly selected %s membership tier before the quest write',
      async () => {
        const tierId = new Types.ObjectId();
        questModel.findById.mockReturnValue(makeQuery(futureQuest()));
        membershipTierModel.find.mockReturnValue(makeQuery([]));

        await expect(
          service.updateQuestTasks(questId, {
            ...config([]),
            audience: {
              kind: 'membership_tiers',
              tier_ids: [tierId.toHexString()],
            },
          }),
        ).rejects.toMatchObject({
          status: 400,
          response: expect.objectContaining({
            code: 'QUEST_MEMBERSHIP_TIERS_UNAVAILABLE',
            tier_ids: [tierId.toHexString()],
          }),
        });
        expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );

    it('revalidates an unchanged selected tier when new task economics are saved', async () => {
      const tierId = new Types.ObjectId();
      const taskKey = 'task_membership_economics_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tierId.toHexString()],
        },
        tasks: [existingTask],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));
      membershipTierModel.find.mockReturnValue(makeQuery([]));

      await expect(
        service.updateQuestTasks(questId, {
          ...config([referralTask({ task_key: taskKey, points: 75 })]),
          audience: {
            kind: 'membership_tiers',
            tier_ids: [tierId.toHexString()],
          },
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'QUEST_MEMBERSHIP_TIERS_UNAVAILABLE',
        }),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('allows a frozen wording-only edit when its unchanged selected tier is now unavailable', async () => {
      const tierId = new Types.ObjectId();
      const taskKey = 'task_frozen_membership_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tierId.toHexString()],
        },
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        task_v2_state_frozen_at: new Date('2026-01-01T00:00:00.000Z'),
        tasks: [existingTask],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));

      await service.updateQuestTasks(questId, {
        ...config([
          referralTask({
            task_key: taskKey,
            wording_en: 'Invite one eligible friend',
          }),
        ]),
        audience: {
          kind: 'membership_tiers',
          tier_ids: [tierId.toHexString()],
        },
      });

      expect(membershipTierModel.find).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('rejects a client task key that does not belong to the quest', async () => {
      questModel.findById.mockReturnValue(makeQuery(futureQuest()));

      await expect(
        service.updateQuestTasks(
          questId,
          config([referralTask({ task_key: 'task_forged_key_12345' })]),
        ),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.stringContaining('task_key'),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects economic edits after the quest starts with a stable 409 code', async () => {
      const taskKey = 'task_existing_key_1234';
      const quest = futureQuest({
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        end_date: new Date('2099-01-01T00:00:00.000Z'),
        tasks: [
          {
            ...referralTask(),
            task_key: taskKey,
            sort_order: 0,
            wording: 'Invite a friend',
          },
        ],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));

      await expect(
        service.updateQuestTasks(
          questId,
          config([referralTask({ task_key: taskKey, points: 75 })]),
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'QUEST_TASK_CONFIG_FROZEN' }),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each(['has_outbox', 'has_progress', 'has_award'] as const)(
      'rejects economic edits when the inspector reports %s',
      async (effect) => {
        const taskKey = 'task_existing_key_1234';
        const quest = futureQuest({
          tasks: [
            {
              ...referralTask(),
              task_key: taskKey,
              sort_order: 0,
              wording: 'Invite a friend',
            },
          ],
        });
        questModel.findById.mockReturnValue(makeQuery(quest));
        questTaskStateInspector.withTaskConfigEditFence.mockImplementationOnce(
          async (_id, operation) =>
            operation({
              has_outbox: effect === 'has_outbox',
              has_progress: effect === 'has_progress',
              has_award: effect === 'has_award',
            }),
        );

        await expect(
          service.updateQuestTasks(
            questId,
            config([referralTask({ task_key: taskKey, points: 75 })]),
          ),
        ).rejects.toMatchObject({
          status: 409,
          response: expect.objectContaining({
            code: 'QUEST_TASK_CONFIG_FROZEN',
          }),
        });
      },
    );

    it('allows wording and notes edits after start and does not require the no-effect filter', async () => {
      const taskKey = 'task_existing_key_1234';
      const existingTask = {
        ...referralTask(),
        task_key: taskKey,
        sort_order: 0,
        wording: 'Invite a friend',
      };
      const quest = futureQuest({
        start_date: new Date('2020-01-01T00:00:00.000Z'),
        end_date: new Date('2099-01-01T00:00:00.000Z'),
        task_v2_state_frozen_at: new Date('2026-01-01T00:00:00.000Z'),
        tasks: [existingTask],
      });
      questModel.findById.mockReturnValue(makeQuery(quest));
      questModel.findOneAndUpdate.mockReturnValue(makeQuery(quest));

      await service.updateQuestTasks(
        questId,
        config([
          referralTask({
            task_key: taskKey,
            wording_en: 'Invite one friend',
            notes: 'Copy reviewed',
          }),
        ]),
      );

      const [filter, update] = questModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual({
        _id: new Types.ObjectId(questId),
        config_revision: 0,
      });
      expect(update.$set.tasks[0]).toEqual(
        expect.objectContaining({
          task_key: taskKey,
          points: 50,
          wording_en: 'Invite one friend',
          notes: 'Copy reviewed',
        }),
      );
    });

    it('fails closed for task_v2 when the state inspector is unavailable', async () => {
      questModel.findById.mockReturnValue(makeQuery(futureQuest()));
      (
        service as unknown as { questTaskStateInspector?: unknown }
      ).questTaskStateInspector = undefined;

      await expect(
        service.updateQuestTasks(questId, config([referralTask()])),
      ).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'QUEST_TASK_STATE_INSPECTOR_UNAVAILABLE',
        }),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each(['feature_disabled', 'unsupported_mongo_topology'])(
      'does not mutate task-v2 config when the engine reports %s',
      async (reason) => {
        questModel.findById.mockReturnValue(makeQuery(futureQuest()));
        questTaskStateInspector.withTaskConfigEditFence.mockRejectedValueOnce(
          new HttpException(
            {
              code: 'QUEST_TASK_V2_UNAVAILABLE',
              message: `Task-v2 unavailable: ${reason}`,
            },
            503,
          ),
        );

        await expect(
          service.updateQuestTasks(questId, config([referralTask()])),
        ).rejects.toMatchObject({
          status: 503,
          response: expect.objectContaining({
            code: 'QUEST_TASK_V2_UNAVAILABLE',
          }),
        });
        expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(offerModel.bulkWrite).not.toHaveBeenCalled();
      },
    );

    it('returns a stable revision conflict before writing stale state', async () => {
      questModel.findById.mockReturnValue(
        makeQuery(futureQuest({ config_revision: 3 })),
      );

      await expect(
        service.updateQuestTasks(questId, config([referralTask()], 2)),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({
          code: 'QUEST_CONFIG_REVISION_CONFLICT',
        }),
      });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('quest task read and projection isolation', () => {
    const questId = new Types.ObjectId().toHexString();
    const offerObjectId = new Types.ObjectId();

    it('maps a missing-model legacy offer task to canonical brand_purchase on read', async () => {
      questModel.find.mockReturnValue(
        makeQuery([
          {
            _id: questId,
            start_date: new Date('2099-01-01T00:00:00.000Z'),
            end_date: new Date('2099-02-01T00:00:00.000Z'),
            tasks: [
              {
                offer: offerObjectId,
                offer_id: 101,
                merchant_id: 1001,
                extra_point: 50,
                sort_order: 4,
                enabled: true,
                wording: 'Legacy',
              },
            ],
          },
        ]),
      );

      const [quest] = await service.getQuestAdmin();

      expect(quest).toEqual(
        expect.objectContaining({
          reward_model: 'legacy_v1',
          config_revision: 0,
          timezone: 'Asia/Bangkok',
          tasks: [
            expect.objectContaining({
              task_key: expect.stringMatching(/^task_/),
              task_type: 'brand_purchase',
              points: 50,
              extra_point: 50,
              sort_order: 4,
              wording: 'Legacy',
            }),
          ],
        }),
      );
    });

    it('does not fall back to global offer bonuses for task_v2 referral-only quests', async () => {
      questModel.findOne.mockReturnValue(
        makeQuery({
          _id: questId,
          reward_model: 'task_v2',
          tasks: [
            {
              task_key: 'task_referral_key_1234',
              task_type: 'friend_referral',
              completion_rule: 'account_created',
              points: 50,
              enabled: true,
            },
          ],
        }),
      );
      offerModel.find.mockReturnValue(
        makeQuery([{ merchant_id: 9999, extra_point: 999 }]),
      );

      await expect(
        (
          service as unknown as {
            getQuestExtraPointTasksForRange: (
              start: string,
              end: string,
            ) => Promise<unknown[]>;
          }
        ).getQuestExtraPointTasksForRange('2026-07-01', '2026-07-31'),
      ).resolves.toEqual([]);
      expect(offerModel.find).not.toHaveBeenCalled();
    });

    it('includes only brand_purchase tasks in deeplink summaries', async () => {
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          reward_model: 'task_v2',
          tasks: [
            {
              task_key: 'task_referral_key_1234',
              task_type: 'friend_referral',
              completion_rule: 'account_created',
              points: 50,
              enabled: true,
            },
            {
              task_key: 'task_brand_key_1234567',
              task_type: 'brand_purchase',
              offer: {
                _id: offerObjectId,
                offer_name_display: 'Brand',
                tracking_link: 'https://shop.example',
              },
              offer_id: 101,
              merchant_id: 1001,
              points: 75,
              extra_point: 75,
              sort_order: 1,
              enabled: true,
            },
          ],
        }),
      );
      deeplinkModel.aggregate.mockResolvedValue([]);

      const result = await service.getQuestTaskDeeplinkSummary(questId);

      expect(deeplinkModel.aggregate.mock.calls[0][0][0].$match).toEqual({
        $or: [{ offer_id: 101, merchant_id: 1001 }],
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          offer_id: 101,
          merchant_id: 1001,
          extra_point: 75,
        }),
      );
    });
  });

  describe('updateQuestRewards', () => {
    const questId = new Types.ObjectId().toHexString();

    it('updateQuestRewards > given duplicate ranks > then it rejects before writing', async () => {
      await expect(
        service.updateQuestRewards(questId, {
          expected_config_revision: 0,
          rewards: [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 1, reward: 800, currency: 'THB' },
          ],
        }),
      ).rejects.toThrow(HttpException);

      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateQuestRewards > given valid rewards > then it stores them sorted by rank', async () => {
      const endDate = new Date('2026-06-30T00:00:00.000Z');
      questModel.findById.mockReturnValue(
        makeQuery({ _id: questId, end_date: endDate }),
      );
      questModel.findOneAndUpdate.mockReturnValue(
        makeQuery({
          _id: questId,
          rewards: [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 2, reward: 800, currency: 'THB' },
          ],
        }),
      );

      await service.updateQuestRewards(questId, {
        expected_config_revision: 0,
        rewards: [
          { rank: 2, reward: 800, currency: 'THB' },
          { rank: 1, reward: 1200, currency: 'THB' },
        ],
      });

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(questId),
          $or: [
            { config_revision: 0 },
            { config_revision: { $exists: false } },
          ],
        },
        {
          $set: {
            rewards: [
              { rank: 1, reward: 1200, currency: 'THB' },
              { rank: 2, reward: 800, currency: 'THB' },
            ],
            reward_distribution_mode: 'campaign_end',
            reward_distribution_delay_days: 0,
            reward_distribution_scheduled_at: endDate,
          },
          $inc: { config_revision: 1 },
        },
        { new: true },
      );
    });

    it('updateQuestRewards > given delayed automatic distribution > then it stores the scheduled payout date', async () => {
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          end_date: new Date('2026-06-30T00:00:00.000Z'),
        }),
      );
      questModel.findOneAndUpdate.mockReturnValue(makeQuery({ _id: questId }));

      await service.updateQuestRewards(questId, {
        expected_config_revision: 0,
        reward_distribution_mode: 'after_days',
        reward_distribution_delay_days: 7,
        rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
      });

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: new Types.ObjectId(questId),
          $or: [
            { config_revision: 0 },
            { config_revision: { $exists: false } },
          ],
        },
        {
          $set: {
            rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
            reward_distribution_mode: 'after_days',
            reward_distribution_delay_days: 7,
            reward_distribution_scheduled_at: new Date(
              '2026-07-07T00:00:00.000Z',
            ),
          },
          $inc: { config_revision: 1 },
        },
        { new: true },
      );
    });

    it('updateQuestRewards > given after-days distribution with zero delay > then it rejects before writing', async () => {
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          end_date: new Date('2026-06-30T00:00:00.000Z'),
        }),
      );

      await expect(
        service.updateQuestRewards(questId, {
          expected_config_revision: 0,
          reward_distribution_mode: 'after_days',
          reward_distribution_delay_days: 0,
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
        }),
      ).rejects.toThrow(HttpException);

      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('fences task-v2 reward economics and increments the shared config revision', async () => {
      const endDate = new Date('2099-06-30T00:00:00.000Z');
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          reward_model: 'task_v2',
          config_revision: 4,
          start_date: new Date('2099-06-01T00:00:00.000Z'),
          end_date: endDate,
          rewards: [],
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
          reward_distribution_scheduled_at: endDate,
        }),
      );
      questModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: questId, config_revision: 5 }),
      );

      await service.updateQuestRewards(questId, {
        expected_config_revision: 4,
        rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
        reward_distribution_mode: 'campaign_end',
        reward_distribution_delay_days: 0,
      });

      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).toHaveBeenCalledWith(questId, expect.any(Function), {
        start_at: new Date('2099-06-01T00:00:00.000Z'),
        end_at: endDate,
      });
      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: new Types.ObjectId(questId),
          config_revision: 4,
          start_date: { $gt: expect.any(Date) },
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
          ],
        }),
        {
          $set: expect.objectContaining({
            rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
          }),
          $inc: { config_revision: 1 },
        },
        { new: true },
      );
    });

    it('returns an unchanged task-v2 reward config without a fence or revision write', async () => {
      const endDate = new Date('2099-06-30T00:00:00.000Z');
      const quest = {
        _id: questId,
        reward_model: 'task_v2',
        config_revision: 4,
        start_date: new Date('2099-06-01T00:00:00.000Z'),
        end_date: endDate,
        rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
        reward_distribution_mode: 'campaign_end',
        reward_distribution_delay_days: 0,
        reward_distribution_scheduled_at: endDate,
      };
      questModel.findById.mockReturnValue(makeQuery(quest));

      await expect(
        service.updateQuestRewards(questId, {
          expected_config_revision: 4,
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
        }),
      ).resolves.toBe(quest);

      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a legacy reward edit after immutable manifest resolution begins', async () => {
      const endDate = new Date('2099-06-30T00:00:00.000Z');
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          reward_model: 'legacy_v1',
          config_revision: 4,
          start_date: new Date('2099-06-01T00:00:00.000Z'),
          end_date: endDate,
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
          reward_distribution_scheduled_at: endDate,
          legacy_payout_resolution_started_at: new Date(
            '2026-07-17T00:00:00.000Z',
          ),
        }),
      );

      await expect(
        service.updateQuestRewards(questId, {
          expected_config_revision: 4,
          rewards: [{ rank: 1, reward: 9999, currency: 'THB' }],
        }),
      ).rejects.toMatchObject({ status: 409 });
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it.each(['has_outbox', 'has_progress', 'has_award'] as const)(
      'rejects task-v2 reward changes when the inspector reports %s',
      async (effect) => {
        const endDate = new Date('2099-06-30T00:00:00.000Z');
        questModel.findById.mockReturnValue(
          makeQuery({
            _id: questId,
            reward_model: 'task_v2',
            config_revision: 2,
            start_date: new Date('2099-06-01T00:00:00.000Z'),
            end_date: endDate,
            rewards: [],
            reward_distribution_mode: 'campaign_end',
            reward_distribution_delay_days: 0,
            reward_distribution_scheduled_at: endDate,
          }),
        );
        questTaskStateInspector.withTaskConfigEditFence.mockImplementationOnce(
          async (_id, operation) =>
            operation({
              has_outbox: effect === 'has_outbox',
              has_progress: effect === 'has_progress',
              has_award: effect === 'has_award',
            }),
        );

        await expect(
          service.updateQuestRewards(questId, {
            expected_config_revision: 2,
            rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
          }),
        ).rejects.toMatchObject({
          status: 409,
          response: expect.objectContaining({
            code: 'QUEST_TASK_CONFIG_FROZEN',
          }),
        });
        expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
      },
    );
  });

  describe('getQuestAdminLeaderboard', () => {
    const questId = new Types.ObjectId().toHexString();

    it('getQuestAdminLeaderboard > given quest rewards > then rows include rank, points, and reward', async () => {
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          start_date: new Date('2026-06-01T00:00:00.000Z'),
          end_date: new Date('2026-06-30T00:00:00.000Z'),
          rewards: [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 2, reward: 800, currency: 'THB' },
          ],
        }),
      );
      jest.spyOn(service, 'getQuestRankListOfPoint').mockResolvedValue([
        {
          user_id: new Types.ObjectId('000000000000000000000001'),
          username: 'winner',
          email: 'winner@gogocash.co',
          point: 500,
        },
        {
          user_id: new Types.ObjectId('000000000000000000000002'),
          username: 'runner',
          email: 'runner@gogocash.co',
          point: 300,
        },
        {
          user_id: new Types.ObjectId('000000000000000000000003'),
          username: 'third',
          email: 'third@gogocash.co',
          point: 100,
        },
      ] as never);

      const result = await service.getQuestAdminLeaderboard(questId);

      expect(service.getQuestRankListOfPoint).toHaveBeenCalledWith(
        '2026-06-01',
        '2026-06-30',
      );
      expect(result.data).toEqual([
        expect.objectContaining({
          rank: 1,
          username: 'winner',
          point: 500,
          reward: 1200,
          currency: 'THB',
        }),
        expect.objectContaining({
          rank: 2,
          username: 'runner',
          point: 300,
          reward: 800,
          currency: 'THB',
        }),
        expect.objectContaining({
          rank: 3,
          username: 'third',
          point: 100,
          reward: 0,
          currency: 'THB',
        }),
      ]);
    });

    it('getQuestAdminLeaderboard > given empty selected range in local mode > then it returns the latest available leaderboard with source dates', async () => {
      questModel.findById.mockReturnValue(
        makeQuery({
          _id: questId,
          start_date: new Date('2026-07-01T00:00:00.000Z'),
          end_date: new Date('2026-07-30T00:00:00.000Z'),
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
        }),
      );
      const rankSpy = jest
        .spyOn(service, 'getQuestRankListOfPoint')
        .mockResolvedValueOnce([] as never)
        .mockResolvedValueOnce([
          {
            user_id: new Types.ObjectId('000000000000000000000001'),
            username: 'winner',
            email: 'winner@gogocash.co',
            point: 450,
            extra_point_received: 50,
          },
        ] as never);
      pointModel.aggregate.mockResolvedValue([
        { latestConversionDate: new Date('2026-06-17T00:00:00.000Z') },
      ]);

      const result = await service.getQuestAdminLeaderboard(questId);

      expect(rankSpy).toHaveBeenNthCalledWith(1, '2026-07-01', '2026-07-30');
      expect(rankSpy).toHaveBeenNthCalledWith(2, '2026-06-01', '2026-06-30');
      expect(pointModel.aggregate).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        data_source: 'latest_available',
        empty_range_start_date: '2026-07-01',
        empty_range_end_date: '2026-07-30',
        source_start_date: '2026-06-01',
        source_end_date: '2026-06-30',
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          rank: 1,
          username: 'winner',
          point: 450,
          reward: 1200,
          currency: 'THB',
        }),
      ]);
    });
  });

  describe('getMyQuestRankList', () => {
    const userId = new Types.ObjectId().toHexString();

    // Auth boundary: ranking is a per-user view; an unknown user must be
    // rejected rather than silently returning someone else's rank.
    it('getMyQuestRankList > given an unknown user > then it throws UnauthorizedException', async () => {
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.getMyQuestRankList(userId, '2026-01-01', '2026-01-31'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('getMyQuestRankList > given the user sits second on the leaderboard > then it returns a 1-based rank', async () => {
      const otherUserId = new Types.ObjectId().toHexString();
      // getQuestRankList constructs `new Types.ObjectId(user_id)`, so every
      // leaderboard user_id must be a valid 24-char hex string.
      conversionModel.aggregate.mockResolvedValue([
        { user_id: otherUserId },
        { user_id: userId },
      ]);
      // userModel.findOne is reused inside getQuestRankList's per-row map.
      userModel.findOne
        .mockResolvedValueOnce({ _id: new Types.ObjectId() }) // auth check
        .mockResolvedValue({ username: 'u', email: 'e' }); // row lookups
      conversionModel.find.mockReturnValue(makeQuery([])); // no conversions => point 0

      const result = await service.getMyQuestRankList(
        userId,
        '2026-01-01',
        '2026-01-31',
      );

      expect(result.user_id).toBe(userId);
      expect(result.rank).toBe(2);
    });
  });

  describe('getQuestRankList currency conversion', () => {
    // P1-COLLSCAN: user-scoped leaderboard queries must not use aff_sub1 $regex.
    it('getQuestRankList > given a user id > then aggregate $match uses indexed scope filter (no $regex)', async () => {
      const scopedUserId = new Types.ObjectId().toHexString();
      conversionModel.aggregate.mockResolvedValue([]);
      userModel.findOne.mockResolvedValue({ username: 'u', email: 'e' });
      conversionModel.find.mockReturnValue(makeQuery([]));

      await service.getQuestRankList('2026-01-01', '2026-01-31', scopedUserId);

      const matchStage = conversionModel.aggregate.mock.calls[0][0][0].$match;
      expect(matchStage).toEqual(
        expect.objectContaining(
          buildApprovedUserConversionsFilter(scopedUserId),
        ),
      );
      expect(JSON.stringify(matchStage)).not.toContain('$regex');
    });

    it('getQuestRankList > given no user id > then aggregate $match scopes by indexed user_id (no $regex)', async () => {
      conversionModel.aggregate.mockResolvedValue([]);
      userModel.findOne.mockResolvedValue({ username: 'u', email: 'e' });
      conversionModel.find.mockReturnValue(makeQuery([]));

      await service.getQuestRankList('2026-01-01', '2026-01-31');

      const matchStage = conversionModel.aggregate.mock.calls[0][0][0].$match;
      expect(matchStage).toEqual(
        expect.objectContaining({
          conversion_status: 'approved',
          user_id: { $exists: true, $ne: null },
        }),
      );
      expect(JSON.stringify(matchStage)).not.toContain('$regex');
    });

    // Cross-currency leaderboards: USD sales must be normalized to THB via the
    // FX helper before they enter the point total, or USD buyers would be
    // ranked on raw foreign-currency amounts.
    it('getQuestRankList > given a USD conversion > then sale_amount is converted to THB for the point total', async () => {
      conversionModel.aggregate.mockResolvedValue([
        { user_id: new Types.ObjectId().toHexString() },
      ]);
      userModel.findOne.mockResolvedValue({ username: 'usd-user', email: 'e' });
      conversionModel.find.mockReturnValue(
        makeQuery([{ currency: 'USD', sale_amount: 10 }]),
      );
      convertToTHB.mockResolvedValue({ amount: 350, exchangeRate: 35 });

      const result = (await service.getQuestRankList(
        '2026-01-01',
        '2026-01-31',
      )) as unknown as Array<{
        point: number;
        conversion: Array<{ currency: string }>;
      }>;

      expect(convertToTHB).toHaveBeenCalledWith('USD', 10);
      expect(result[0].point).toBe(350);
      expect(result[0].conversion[0].currency).toBe('THB');
    });

    it('getQuestRankList > given mixed THB rows > then THB amounts pass through at rate 1 and the list is sorted descending', async () => {
      conversionModel.aggregate.mockResolvedValue([
        { user_id: new Types.ObjectId().toHexString() },
        { user_id: new Types.ObjectId().toHexString() },
      ]);
      userModel.findOne.mockResolvedValue({ username: 'n', email: 'e' });
      conversionModel.find
        .mockReturnValueOnce(makeQuery([{ currency: 'THB', sale_amount: 100 }]))
        .mockReturnValueOnce(
          makeQuery([{ currency: 'THB', sale_amount: 900 }]),
        );

      const result = (await service.getQuestRankList(
        '2026-01-01',
        '2026-01-31',
      )) as unknown as Array<{ point: number }>;

      expect(convertToTHB).not.toHaveBeenCalled();
      expect(result[0].point).toBe(900); // sorted desc: highest first
      expect(result[1].point).toBe(100);
    });
  });

  describe('questSocial', () => {
    const userId = new Types.ObjectId().toHexString();

    it('questSocial > given no open quest > then it throws HttpException 400', async () => {
      questModel.findOne.mockReturnValue(makeQuery(null));

      await expect(
        service.questSocial(userId, 'facebook', 'follow'),
      ).rejects.toBeInstanceOf(HttpException);
      expect(socialRewardModel.create).not.toHaveBeenCalled();
    });

    // Idempotency: re-submitting the same social action must return the
    // existing reward record rather than minting a duplicate claim.
    it('questSocial > given an existing reward for the action > then it returns it without creating another', async () => {
      questModel.findOne.mockReturnValue(
        makeQuery(reconciledLegacySocialQuest(new Types.ObjectId())),
      );
      const existing = { _id: 'sr-1', reward_status: false };
      socialRewardModel.findOneAndUpdate.mockResolvedValue(existing);

      const result = await service.questSocial(userId, 'facebook', 'follow');

      expect(result).toMatchObject(existing);
      expect(socialRewardModel.create).not.toHaveBeenCalled();
    });

    it('questSocial > given no existing reward > then it creates a new unclaimed reward', async () => {
      questModel.findOne.mockReturnValue(
        makeQuery(reconciledLegacySocialQuest(new Types.ObjectId())),
      );
      socialRewardModel.findOneAndUpdate.mockResolvedValue({
        toObject: () => ({ _id: 'new-sr', reward_status: false }),
      });

      const result = await service.questSocial(userId, 'facebook', 'follow');

      expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ legacy_payout_key: expect.any(String) }),
        {
          $setOnInsert: expect.objectContaining({
            reward_status: false,
            action: 'follow',
          }),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      expect(result).toMatchObject({ reward_status: false });
    });
  });

  describe('updateQuestSocial', () => {
    const userId = new Types.ObjectId().toHexString();
    const rewardId = new Types.ObjectId().toHexString();

    it('updateQuestSocial > given the reward is not found > then it throws HttpException 404', async () => {
      socialRewardModel.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuestSocial(userId, rewardId),
      ).rejects.toBeInstanceOf(HttpException);
    });

    // Claiming a social reward must credit the fixed 50-point bonus AND flip
    // reward_status so it can't be claimed twice.
    it('updateQuestSocial > given an unclaimed reward > then it grants 50 points and marks it claimed', async () => {
      const saved = { _id: 'sr', reward_status: true };
      const reward = {
        _id: new Types.ObjectId(),
        quest_id: new Types.ObjectId(),
        type: 'facebook',
        action: 'follow',
        reward_status: false,
        legacy_payout_key: '',
      };
      reward.legacy_payout_key = `legacy:quest:${reward.quest_id}:social:facebook:follow:user:${userId}`;
      socialRewardModel.findOne.mockResolvedValue(reward);
      questModel.findOne.mockReturnValue(
        makeQuery(reconciledLegacySocialQuest(reward.quest_id)),
      );
      pointModel.findOneAndUpdate.mockReturnValue(
        makeQuery({
          _id: 'point',
          user_id: new Types.ObjectId(userId),
          point: 50,
          conversion_id: 0,
          type: 'add',
          action: `reward_quest_social:facebook:follow:${reward._id}`,
          idempotency_key: `legacy:quest:${reward.quest_id}:social:facebook:follow:user:${userId}`,
        }),
      );
      socialRewardModel.findOneAndUpdate.mockResolvedValue(saved);

      const result = await service.updateQuestSocial(userId, rewardId);

      expect(pointModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(socialRewardModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });
  });

  describe('getQuestSocial', () => {
    const userId = new Types.ObjectId().toHexString();

    it('getQuestSocial > given no open quest > then it throws HttpException', async () => {
      questModel.findOne.mockReturnValue(makeQuery(null));

      await expect(service.getQuestSocial(userId)).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('getQuestSocial > given an open quest > then it returns the quest with the user social rewards', async () => {
      const quest = { _id: 'q1', status: 'open' };
      const rewards = [{ _id: 'sr1' }];
      questModel.findOne.mockReturnValue(makeQuery(quest));
      socialRewardModel.find.mockReturnValue(makeQuery(rewards));

      await expect(service.getQuestSocial(userId)).resolves.toEqual({
        quest,
        socialRewards: rewards,
      });
    });
  });

  describe('getQuestOpen', () => {
    it('getQuestOpen > then it selects the current date window without trusting stored status', async () => {
      questModel.findOne.mockReturnValue(
        makeQuery({
          _id: 'q1',
          start_date: new Date('2026-01-01'),
          end_date: new Date('2099-01-01'),
          status: 'close',
        }),
      );

      await service.getQuestOpen();

      expect(questModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          $and: expect.arrayContaining([
            expect.objectContaining({ $or: expect.any(Array) }),
            expect.objectContaining({ $or: expect.any(Array) }),
          ]),
        }),
      );
    });
  });

  describe('getQuestAll', () => {
    it('getQuestAll > given no quests exist > then it throws HttpException', async () => {
      questModel.find.mockReturnValue(makeQuery([]));

      await expect(service.getQuestAll()).rejects.toBeInstanceOf(HttpException);
    });

    it('getQuestAll > given quests exist > then it returns them', async () => {
      const quests = [
        {
          _id: 'q1',
          start_date: new Date('2026-01-01'),
          end_date: new Date('2099-01-01'),
        },
        {
          _id: 'q2',
          start_date: new Date('2099-02-01'),
          end_date: new Date('2099-03-01'),
        },
      ];
      questModel.find.mockReturnValue(makeQuery(quests));

      await expect(service.getQuestAll()).resolves.toEqual([
        expect.objectContaining({ _id: 'q1', status: 'open' }),
        expect.objectContaining({ _id: 'q2', status: 'scheduled' }),
      ]);
    });
  });

  describe('getSpacialPointNextRound bonus math', () => {
    // The next-round special-point payout is money-equivalent. Each lever must
    // be applied independently and stacked, and users earning nothing must be
    // dropped from the payout list.
    it('getSpacialPointNextRound > given a top-10 social spender over 300 > then bonuses stack to 190', async () => {
      jest.spyOn(service, 'getQuestRankListOfPoint').mockResolvedValue([
        {
          user_id: 'whale',
          username: 'w',
          email: 'e',
          point: 500,
          point_social_reward: 80,
        },
      ] as never);

      const result = await service.getSpacialPointNextRound(
        '2026-01-01',
        '2026-01-31',
      );

      expect(result).toHaveLength(1);
      expect(result[0].special_point_next_round).toBe(190); // 80 + 80 + 30
      expect(result[0].breakdown).toEqual({
        rank_bonus: 80,
        social_bonus: 80,
        spend_bonus: 30,
      });
      expect(result[0].rank).toBe(1);
    });

    it('getSpacialPointNextRound > given a user who qualifies for nothing > then they are filtered out of the payout', async () => {
      jest.spyOn(service, 'getQuestRankListOfPoint').mockResolvedValue(
        // 11 rows so the 11th is outside top-10, with no social reward and < 300 spend.
        Array.from({ length: 11 }, (_, i) => ({
          user_id: `u${i}`,
          username: 'n',
          email: 'e',
          point: i === 10 ? 100 : 1000,
          point_social_reward: i === 10 ? 0 : 80,
        })) as never,
      );

      const result = await service.getSpacialPointNextRound(
        '2026-01-01',
        '2026-01-31',
      );

      // Only top-10 qualify (each gets rank+social bonus); the 11th earns 0 and is dropped.
      expect(result).toHaveLength(10);
      expect(result.every((r) => r.user_id !== 'u10')).toBe(true);
    });

    it('getSpacialPointNextRound > given an exactly-300 spender outside top-10 with no social > then only the spend bonus of 30 applies', async () => {
      jest.spyOn(service, 'getQuestRankListOfPoint').mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({
          user_id: `u${i}`,
          username: 'n',
          email: 'e',
          point: i === 10 ? 300 : 5000,
          point_social_reward: 0,
        })) as never,
      );

      const result = await service.getSpacialPointNextRound(
        '2026-01-01',
        '2026-01-31',
      );

      const target = result.find((r) => r.user_id === 'u10');
      expect(target).toBeDefined();
      expect(target?.special_point_next_round).toBe(30);
      expect(target?.breakdown).toEqual({
        rank_bonus: 0,
        social_bonus: 0,
        spend_bonus: 30,
      });
    });
  });

  describe('createQuest', () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
      'base64',
    );
    const image = (fieldname: string, buffer = png) =>
      ({
        fieldname,
        originalname: `${fieldname}.png`,
        mimetype: 'image/png',
        size: buffer.length,
        buffer,
      }) as Express.Multer.File;
    const allFiles = () => ({
      banner_en: [image('banner_en')],
      banner_th: [image('banner_th')],
      sub_banner_en: [image('sub_banner_en')],
      sub_banner_th: [image('sub_banner_th')],
    });
    const dto = (overrides: Record<string, unknown> = {}) =>
      ({
        request_key: 'quest-media:point-service-test',
        campaign_revision: 0,
        expected_config_revision: 0,
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        facebook_post: '',
        facebook_page: '',
        line: '',
        ...overrides,
      }) as never;

    it('requires all four actual multipart files for a new quest and ignores body strings', async () => {
      questModel.findById.mockResolvedValue(null);

      await expect(
        service.createQuest(
          dto({
            banner_en: 'stored:untrusted-en',
            banner_th: 'stored:untrusted-th',
            sub_banner_en: 'stored:untrusted-sub-en',
            sub_banner_th: 'stored:untrusted-sub-th',
          }),
          {},
        ),
      ).rejects.toMatchObject({
        message:
          'All four quest banners are required when creating a quest: Banner EN, Banner TH, Sub banner EN, Sub banner TH.',
        status: HttpStatus.BAD_REQUEST,
      });
      expect(questModel.findById).not.toHaveBeenCalled();
      expect(questMediaWrite.execute).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('validates every selected image before the durable writer or persistence', async () => {
      questModel.findById.mockResolvedValue(null);
      const files = allFiles();
      files.banner_th = [image('banner_th', Buffer.from('spoofed'))];

      await expect(service.createQuest(dto(), files)).rejects.toMatchObject({
        message:
          'Banner TH must be a genuine PNG, JPEG, or WebP image. Please choose the image again.',
      });
      expect(questModel.findById).not.toHaveBeenCalled();
      expect(questMediaWrite.execute).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a nonexistent update id before the writer can upsert a partial-banner quest', async () => {
      const missingQuestId = new Types.ObjectId();
      questModel.findById.mockResolvedValue(null);

      await expect(
        service.createQuest(
          dto({ _id: String(missingQuestId), campaign_revision: 0 }),
          { banner_en: [image('banner_en')] },
        ),
      ).rejects.toMatchObject({
        message: 'Quest not found',
        status: HttpStatus.NOT_FOUND,
      });
      expect(questModel.findById).toHaveBeenCalledWith(missingQuestId);
      expect(questMediaWrite.execute).not.toHaveBeenCalled();
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('passes four validated files, a stable command key, and a derived status to the durable writer', async () => {
      questModel.findById.mockResolvedValue(null);
      const saved = { _id: 'quest-with-media', campaign_revision: 1 };
      questMediaWrite.execute.mockResolvedValue(saved);

      await expect(service.createQuest(dto(), allFiles())).resolves.toBe(saved);

      expect(questMediaWrite.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          requestKey: 'quest-media:point-service-test',
          expectedRevision: 0,
          payloadHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          questPatch: expect.objectContaining({ status: 'scheduled' }),
          uploads: [
            expect.objectContaining({ role: 'banner_en' }),
            expect.objectContaining({ role: 'banner_th' }),
            expect.objectContaining({ role: 'sub_banner_en' }),
            expect.objectContaining({ role: 'sub_banner_th' }),
          ],
        }),
      );
      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('keeps an id-less create replay hash stable after later reward settings mutate the quest', async () => {
      const committedQuest = {
        _id: new Types.ObjectId(),
        campaign_revision: 1,
        end_date: new Date('2099-06-30'),
        reward_distribution_mode: 'manual',
        reward_distribution_delay_days: 0,
        reward_distribution_scheduled_at: null,
      };
      questModel.findById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(committedQuest);
      questMediaWrite.execute.mockResolvedValue({
        _id: committedQuest._id,
        campaign_revision: 1,
      });

      await service.createQuest(dto(), allFiles());
      await service.createQuest(dto(), allFiles());

      const initial = questMediaWrite.execute.mock.calls[0][0];
      const replay = questMediaWrite.execute.mock.calls[1][0];
      expect(replay.payloadHash).toBe(initial.payloadHash);
      expect(replay.questPatch).toEqual(initial.questPatch);
      expect(replay.questPatch).toEqual(
        expect.objectContaining({
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
          reward_distribution_scheduled_at: new Date('2099-06-30'),
        }),
      );
    });

    it('keeps a task-v2 schedule media retry stable after the first commit rotates task keys', async () => {
      const questId = new Types.ObjectId();
      const previousQuest = {
        _id: questId,
        campaign_revision: 3,
        config_revision: 5,
        reward_model: 'task_v2',
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        tasks: [
          {
            task_key: 'task_schedule_old_1234',
            task_type: 'friend_referral',
            completion_rule: 'account_created',
            points: 50,
            sort_order: 0,
            enabled: true,
            wording: 'Invite',
            wording_en: 'Invite',
            wording_th: 'ชวนเพื่อน',
            notes: '',
          },
        ],
      };
      const committedQuest = {
        ...previousQuest,
        campaign_revision: 4,
        config_revision: 6,
        start_date: new Date('2099-07-01'),
        end_date: new Date('2099-07-31'),
        tasks: [
          {
            ...previousQuest.tasks[0],
            task_key: 'task_schedule_revision_6_1234',
          },
        ],
      };
      questModel.findById
        .mockResolvedValueOnce(previousQuest)
        .mockResolvedValueOnce(committedQuest);
      questMediaWrite.execute.mockResolvedValue(committedQuest);
      const request = dto({
        _id: String(questId),
        campaign_revision: 3,
        expected_config_revision: 5,
        start_date: new Date('2099-07-01'),
        end_date: new Date('2099-07-31'),
      });
      const files = { banner_en: [image('banner_en')] };

      await service.createQuest(request, files);
      await service.createQuest(request, files);

      const initial = questMediaWrite.execute.mock.calls[0][0];
      const replay = questMediaWrite.execute.mock.calls[1][0];
      expect(initial).toEqual(
        expect.objectContaining({
          economicChange: true,
          taskV2EconomicChange: true,
          commitFence: expect.any(Function),
        }),
      );
      expect(replay).toEqual(
        expect.objectContaining({
          economicChange: false,
          taskV2EconomicChange: false,
        }),
      );
      expect(replay.payloadHash).toBe(initial.payloadHash);
    });

    it('binds guarded QA marker and cleanup nonce identity into the durable command', async () => {
      const previousEnabled = process.env.QUEST_MEDIA_QA_ENABLED;
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.QUEST_MEDIA_QA_ENABLED = 'true';
      process.env.NODE_ENV = 'test';
      questModel.findById.mockResolvedValue(null);
      questMediaWrite.execute.mockResolvedValue({
        _id: 'qa-quest',
        campaign_revision: 1,
      });
      const marker = 'quest-media-qa:point-service-test';
      const firstNonce = 'a'.repeat(32);
      const secondNonce = 'b'.repeat(32);

      try {
        await service.createQuest(
          dto({
            request_key: 'quest-media:qa:point-service-test',
            qa_marker: marker,
            qa_cleanup_nonce: firstNonce,
          }),
          allFiles(),
        );
        await service.createQuest(
          dto({
            request_key: 'quest-media:qa:point-service-test',
            qa_marker: marker,
            qa_cleanup_nonce: secondNonce,
          }),
          allFiles(),
        );
      } finally {
        if (previousEnabled === undefined) {
          delete process.env.QUEST_MEDIA_QA_ENABLED;
        } else {
          process.env.QUEST_MEDIA_QA_ENABLED = previousEnabled;
        }
        process.env.NODE_ENV = previousNodeEnv;
      }

      const first = questMediaWrite.execute.mock.calls[0][0];
      const second = questMediaWrite.execute.mock.calls[1][0];
      expect(first).toEqual(
        expect.objectContaining({
          qaMarker: marker,
          qaCleanupNonceHash: createHash('sha256')
            .update(firstNonce)
            .digest('hex'),
        }),
      );
      expect(second).toEqual(
        expect.objectContaining({
          qaMarker: marker,
          qaCleanupNonceHash: createHash('sha256')
            .update(secondNonce)
            .digest('hex'),
        }),
      );
      expect(second.payloadHash).not.toBe(first.payloadHash);
    });

    it('routes a genuine one-field replacement through the fenced writer', async () => {
      const questId = new Types.ObjectId();
      questModel.findById.mockResolvedValue({
        _id: questId,
        campaign_revision: 7,
        banner_en: 'stored:old-banner-en',
      });
      questMediaWrite.execute.mockResolvedValue({
        _id: questId,
        campaign_revision: 8,
      });

      await service.createQuest(
        dto({ _id: String(questId), campaign_revision: 7 }),
        { banner_en: [image('banner_en')] },
      );

      expect(questMediaWrite.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          questId,
          expectedRevision: 7,
          uploads: [expect.objectContaining({ role: 'banner_en' })],
        }),
      );
    });

    it('updates campaign-only fields with revision CAS and leaves banner refs untouched', async () => {
      const questId = new Types.ObjectId();
      const saved = { _id: questId, campaign_revision: 4 };
      questModel.findById.mockResolvedValue({
        _id: questId,
        campaign_revision: 3,
        config_revision: 2,
        reward_model: 'task_v2',
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        tasks: [
          {
            task_key: 'task_schedule_old_1234',
            task_type: 'friend_referral',
            completion_rule: 'account_created',
            points: 50,
            sort_order: 0,
            enabled: true,
            wording: 'Invite',
            wording_en: 'Invite',
            wording_th: 'ชวนเพื่อน',
            notes: '',
          },
        ],
        banner_en: 'stored:keep-me',
      });
      questModel.findOneAndUpdate.mockResolvedValue(saved);

      await expect(
        service.createQuest(
          dto({
            _id: String(questId),
            campaign_revision: 3,
            expected_config_revision: 2,
            facebook_post: 'copy-only-change',
          }),
          {},
        ),
      ).resolves.toBe(saved);

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: questId, campaign_revision: 3 },
        {
          $set: expect.not.objectContaining({ banner_en: expect.anything() }),
          $inc: { campaign_revision: 1 },
        },
        { new: true },
      );
      expect(questMediaWrite.execute).not.toHaveBeenCalled();
      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).not.toHaveBeenCalled();
    });

    it('matches missing legacy revisions even when Mongoose hydrated defaults to zero', async () => {
      const questId = new Types.ObjectId();
      const legacyRecord = {
        _id: questId,
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        reward_model: 'legacy_v1',
        campaign_revision: 0,
        config_revision: 0,
      };
      questModel.findById.mockResolvedValue({
        ...legacyRecord,
        $isDefault: jest.fn(
          (path: string) =>
            path === 'campaign_revision' || path === 'config_revision',
        ),
        toObject: jest.fn(() => ({ ...legacyRecord })),
      });
      questModel.findOneAndUpdate.mockResolvedValue({
        ...legacyRecord,
        start_date: new Date('2099-07-01'),
        end_date: new Date('2099-07-31'),
        campaign_revision: 1,
        config_revision: 1,
      });

      await service.createQuest(
        dto({
          _id: String(questId),
          campaign_revision: 0,
          expected_config_revision: 0,
          start_date: new Date('2099-07-01'),
          end_date: new Date('2099-07-31'),
        }),
        {},
      );

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: questId,
          $and: [
            {
              $or: [
                { campaign_revision: 0 },
                { campaign_revision: { $exists: false } },
              ],
            },
            {
              $or: [
                { config_revision: 0 },
                { config_revision: { $exists: false } },
              ],
            },
          ],
        },
        expect.objectContaining({
          $inc: { campaign_revision: 1, config_revision: 1 },
        }),
        { new: true },
      );
    });

    it('serializes a direct task-v2 schedule change against event adoption and both revisions', async () => {
      const questId = new Types.ObjectId();
      questModel.findById.mockResolvedValue({
        _id: questId,
        campaign_revision: 3,
        config_revision: 5,
        reward_model: 'task_v2',
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        tasks: [
          {
            task_key: 'task_schedule_old_1234',
            task_type: 'friend_referral',
            completion_rule: 'account_created',
            points: 50,
            sort_order: 0,
            enabled: true,
            wording: 'Invite',
            wording_en: 'Invite',
            wording_th: 'ชวนเพื่อน',
            notes: '',
          },
        ],
      });
      questModel.findOneAndUpdate.mockResolvedValue({
        _id: questId,
        campaign_revision: 4,
        config_revision: 6,
      });

      await service.createQuest(
        dto({
          _id: String(questId),
          campaign_revision: 3,
          expected_config_revision: 5,
          start_date: new Date('2099-07-01'),
          end_date: new Date('2099-07-31'),
        }),
        {},
      );

      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).toHaveBeenCalledWith(String(questId), expect.any(Function), {
        start_at: new Date('2099-07-01'),
        end_at: new Date('2099-07-31'),
      });
      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: questId,
          campaign_revision: 3,
          config_revision: 5,
          start_date: { $gt: expect.any(Date) },
          $or: [
            { task_v2_state_frozen_at: { $exists: false } },
            { task_v2_state_frozen_at: null },
          ],
        }),
        {
          $set: expect.objectContaining({
            start_date: new Date('2099-07-01'),
            end_date: new Date('2099-07-31'),
            tasks: [
              expect.objectContaining({
                task_key: expect.not.stringMatching(/^task_schedule_old_1234$/),
              }),
            ],
          }),
          $inc: { campaign_revision: 1, config_revision: 1 },
        },
        { new: true },
      );
    });

    it('passes a commit-only task-v2 schedule fence to the durable media writer', async () => {
      const questId = new Types.ObjectId();
      questModel.findById.mockResolvedValue({
        _id: questId,
        campaign_revision: 7,
        config_revision: 4,
        reward_model: 'task_v2',
        start_date: new Date('2099-06-27'),
        end_date: new Date('2099-06-30'),
        tasks: [
          {
            task_key: 'task_media_schedule_old_1234',
            task_type: 'friend_referral',
            completion_rule: 'account_created',
            points: 50,
            sort_order: 0,
            enabled: true,
            wording: 'Invite',
            wording_en: 'Invite',
            wording_th: 'ชวนเพื่อน',
            notes: '',
          },
        ],
      });
      questMediaWrite.execute.mockResolvedValue({
        _id: questId,
        campaign_revision: 8,
        config_revision: 5,
      });

      await service.createQuest(
        dto({
          _id: String(questId),
          campaign_revision: 7,
          expected_config_revision: 4,
          start_date: new Date('2099-07-01'),
          end_date: new Date('2099-07-31'),
        }),
        { banner_en: [image('banner_en')] },
      );

      const input = questMediaWrite.execute.mock.calls[0][0];
      expect(input).toEqual(
        expect.objectContaining({
          expectedConfigRevision: 4,
          economicChange: true,
          taskV2EconomicChange: true,
          commitFence: expect.any(Function),
          questPatch: expect.objectContaining({
            tasks: [
              expect.objectContaining({
                task_key: expect.not.stringMatching(
                  /^task_media_schedule_old_1234$/,
                ),
              }),
            ],
          }),
        }),
      );
      const committed = jest.fn().mockResolvedValue('saved');
      await expect(input.commitFence(committed)).resolves.toBe('saved');
      expect(
        questTaskStateInspector.withTaskConfigEditFence,
      ).toHaveBeenCalledWith(String(questId), expect.any(Function), {
        start_at: new Date('2099-07-01'),
        end_at: new Date('2099-07-31'),
      });
      expect(committed).toHaveBeenCalledWith(
        {
          has_outbox: false,
          has_progress: false,
          has_award: false,
        },
        undefined,
      );
    });
  });
});
