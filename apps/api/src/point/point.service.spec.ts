import { HttpException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
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
import { StoredMediaService } from 'src/media/stored-media.service';
import { Deeplink } from 'src/involve/schemas/deeplink.schema';
import * as helper from 'src/utils/helper';

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

describe('PointService', () => {
  let service: PointService;

  let userModel: Record<string, jest.Mock>;
  let pointModel: Record<string, jest.Mock> & jest.Mock;
  let conversionModel: Record<string, jest.Mock>;
  let offerModel: Record<string, jest.Mock>;
  let questModel: Record<string, jest.Mock>;
  let socialRewardModel: Record<string, jest.Mock>;
  let deeplinkModel: Record<string, jest.Mock>;
  let analytics: { capture: jest.Mock };
  let storedMediaService: { replace: jest.Mock; upload: jest.Mock };

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
    pointModelFn.aggregate = jest.fn();
    pointModelFn.find = jest.fn();
    pointModel = pointModelFn;

    userModel = { findOne: jest.fn() };
    conversionModel = { aggregate: jest.fn(), find: jest.fn() };
    offerModel = { find: jest.fn() };
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
      find: jest.fn(),
      create: jest.fn(),
    };
    deeplinkModel = { aggregate: jest.fn().mockResolvedValue([]) };
    analytics = { capture: jest.fn().mockResolvedValue(undefined) };
    storedMediaService = {
      replace: jest
        .fn()
        .mockResolvedValue(
          'https://storage.googleapis.com/gogocash-catalog-staging/quests/banner.png',
        ),
      upload: jest.fn(),
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
        { provide: AnalyticsService, useValue: analytics },
        { provide: StoredMediaService, useValue: storedMediaService },
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

    it('updateQuestTasks > given duplicate offers > then it rejects the payload before writing', async () => {
      await expect(
        service.updateQuestTasks(questId, {
          tasks: [
            {
              offer: offerObjectId.toHexString(),
              offer_id: 101,
              merchant_id: 1001,
              extra_point: 50,
              enabled: true,
            },
            {
              offer: offerObjectId.toHexString(),
              offer_id: 101,
              merchant_id: 1001,
              extra_point: 25,
              enabled: true,
            },
          ],
        }),
      ).rejects.toThrow(HttpException);

      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateQuestTasks > given invalid points > then it rejects the payload before writing', async () => {
      await expect(
        service.updateQuestTasks(questId, {
          tasks: [
            {
              offer: offerObjectId.toHexString(),
              offer_id: 101,
              merchant_id: 1001,
              extra_point: 1,
              enabled: true,
            },
          ],
        }),
      ).rejects.toThrow(HttpException);

      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateQuestTasks > given an active quest task list > then it stores normalized tasks and mirrors offer extra_point values', async () => {
      const secondOfferObjectId = new Types.ObjectId();
      const quest = { _id: questId, status: 'open', tasks: [] };
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
          {
            _id: secondOfferObjectId,
            offer_id: 202,
            merchant_id: 2002,
            status: 'approved',
            disabled: false,
          },
        ]),
      );
      offerModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
      offerModel.bulkWrite = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      questModel.findOneAndUpdate.mockReturnValue(
        makeQuery({ _id: questId, status: 'open' }),
      );

      const result = await service.updateQuestTasks(questId, {
        tasks: [
          {
            offer: offerObjectId.toHexString(),
            offer_id: 101,
            merchant_id: 1001,
            extra_point: 50,
            enabled: true,
            wording: ' Make an order on Klook Travel ',
          },
          {
            offer: secondOfferObjectId.toHexString(),
            offer_id: 202,
            merchant_id: 2002,
            extra_point: 25,
            enabled: false,
            notes: 'hold',
          },
        ],
      });

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(questId) },
        {
          tasks: [
            {
              offer: offerObjectId,
              offer_id: 101,
              merchant_id: 1001,
              extra_point: 50,
              sort_order: 0,
              enabled: true,
              wording: 'Make an order on Klook Travel',
              wording_en: 'Make an order on Klook Travel',
              wording_th: '',
              notes: '',
            },
            {
              offer: secondOfferObjectId,
              offer_id: 202,
              merchant_id: 2002,
              extra_point: 25,
              sort_order: 1,
              enabled: false,
              wording: '',
              wording_en: '',
              wording_th: '',
              notes: 'hold',
            },
          ],
        },
        { new: true },
      );
      expect(offerModel.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [] } },
        { $set: { extra_point: 1 } },
      );
      expect(offerModel.bulkWrite).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: offerObjectId },
            update: { $set: { extra_point: 50 } },
          },
        },
      ]);
      expect(result).toEqual({ _id: questId, status: 'open' });
    });
  });

  describe('updateQuestRewards', () => {
    const questId = new Types.ObjectId().toHexString();

    it('updateQuestRewards > given duplicate ranks > then it rejects before writing', async () => {
      await expect(
        service.updateQuestRewards(questId, {
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
        rewards: [
          { rank: 2, reward: 800, currency: 'THB' },
          { rank: 1, reward: 1200, currency: 'THB' },
        ],
      });

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(questId) },
        {
          rewards: [
            { rank: 1, reward: 1200, currency: 'THB' },
            { rank: 2, reward: 800, currency: 'THB' },
          ],
          reward_distribution_mode: 'campaign_end',
          reward_distribution_delay_days: 0,
          reward_distribution_scheduled_at: endDate,
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
        reward_distribution_mode: 'after_days',
        reward_distribution_delay_days: 7,
        rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
      });

      expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(questId) },
        {
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
          reward_distribution_mode: 'after_days',
          reward_distribution_delay_days: 7,
          reward_distribution_scheduled_at: new Date(
            '2026-07-07T00:00:00.000Z',
          ),
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
          reward_distribution_mode: 'after_days',
          reward_distribution_delay_days: 0,
          rewards: [{ rank: 1, reward: 1200, currency: 'THB' }],
        }),
      ).rejects.toThrow(HttpException);

      expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
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
        makeQuery({ _id: new Types.ObjectId() }),
      );
      const existing = { _id: 'sr-1', reward_status: false };
      socialRewardModel.findOne.mockReturnValue(makeQuery(existing));

      const result = await service.questSocial(userId, 'facebook', 'follow');

      expect(result).toMatchObject(existing);
      expect(socialRewardModel.create).not.toHaveBeenCalled();
    });

    it('questSocial > given no existing reward > then it creates a new unclaimed reward', async () => {
      questModel.findOne.mockReturnValue(
        makeQuery({ _id: new Types.ObjectId() }),
      );
      socialRewardModel.findOne.mockReturnValue(makeQuery(null));
      socialRewardModel.create.mockResolvedValue({
        toObject: () => ({ _id: 'new-sr', reward_status: false }),
      });

      const result = await service.questSocial(userId, 'facebook', 'follow');

      expect(socialRewardModel.create).toHaveBeenCalledTimes(1);
      expect(socialRewardModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ reward_status: false, action: 'follow' }),
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
        type: 'facebook',
        action: 'follow',
        reward_status: false,
        save: jest.fn().mockResolvedValue(saved),
      };
      socialRewardModel.findOne.mockResolvedValue(reward);
      // addPointsToUser's internal dedup finds nothing => it grants.
      pointModel.findOne.mockReturnValue(makeQuery(null));

      const result = await service.updateQuestSocial(userId, rewardId);

      expect(constructedPointDocs).toHaveLength(1);
      expect(constructedPointDocs[0].data).toMatchObject({
        point: 50,
        type: 'add',
      });
      expect(reward.reward_status).toBe(true);
      expect(reward.save).toHaveBeenCalledTimes(1);
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
    it('getQuestOpen > then it only returns currently active open quests', async () => {
      questModel.findOne.mockReturnValue(makeQuery({ _id: 'q1' }));

      await service.getQuestOpen();

      expect(questModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
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
      const quests = [{ _id: 'q1' }, { _id: 'q2' }];
      questModel.find.mockReturnValue(makeQuery(quests));

      await expect(service.getQuestAll()).resolves.toBe(quests);
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
    it('createQuest > given no _id > then upserts on a fresh ObjectId instead of matching status open', async () => {
      questModel.findById.mockResolvedValue(null);
      const saved = { _id: new Types.ObjectId().toHexString(), status: 'open' };
      questModel.findByIdAndUpdate.mockResolvedValue(saved);

      const result = await service.createQuest(
        {
          start_date: new Date('2026-06-27'),
          end_date: new Date('2026-06-30'),
          status: 'open',
          facebook_post: '',
          facebook_page: '',
          line: '',
        } as never,
        {},
      );

      expect(questModel.findById).toHaveBeenCalledTimes(1);
      expect(questModel.findOne).not.toHaveBeenCalled();
      const [questId, update, options] =
        questModel.findByIdAndUpdate.mock.calls[0];
      expect(questId).toBeInstanceOf(Types.ObjectId);
      expect(update).toEqual({
        $set: expect.objectContaining({
          status: 'open',
          facebook_post: '',
        }),
      });
      expect(options).toMatchObject({
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      expect(result).toBe(saved);
    });
  });
});
