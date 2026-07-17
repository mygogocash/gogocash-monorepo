import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TasksService } from './tasks.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Quest } from 'src/point/schemas/quest.schema';
import { Point } from 'src/point/schemas/point.schema';
import { InvolveService } from 'src/involve/involve.service';
import { ConversionIngestService } from 'src/involve/conversion-ingest.service';
import { PointService } from 'src/point/point.service';
import {
  legacyQuestPayoutConfigChecksum,
  legacyRewardManifestHash,
  legacyRewardManifestKey,
} from './legacy-reward-manifest';
import { legacySpecialPointKey } from './legacy-reward-identity';

jest.mock('src/utils/helper', () => ({
  rateCurrencyUSD: jest.fn().mockResolvedValue({ THB: 35 }),
}));

/**
 * The `pointModel` is used as a constructor (`new this.pointModel(data)`),
 * so it must be a jest.fn that captures construction args and returns an
 * object exposing `.save()`. We track every constructed document so tests can
 * assert on the exact persisted payload (money/idempotency-sensitive).
 */
function makePointModelMock() {
  const constructed: Array<{ data: Record<string, unknown>; save: jest.Mock }> =
    [];
  const PointModel = jest
    .fn()
    .mockImplementation((data: Record<string, unknown>) => {
      const doc = { ...data, save: jest.fn().mockResolvedValue(undefined) };
      constructed.push({ data, save: doc.save });
      return doc;
    });
  return { PointModel, constructed };
}

interface Mocks {
  conversionModel: {
    updateMany: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    updateOne: jest.Mock;
    findOne: jest.Mock;
  };
  questModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    db: { collection: jest.Mock };
  };
  manifestCollection: { findOne: jest.Mock; updateOne: jest.Mock };
  pointModel: jest.Mock;
  involveService: { getConversionAll: jest.Mock };
  conversionIngestService: { upsertConversion: jest.Mock };
  pointService: {
    getSpacialPointNextRound: jest.Mock;
    addPointsToUser: jest.Mock;
  };
  constructedPoints: Array<{ data: Record<string, unknown>; save: jest.Mock }>;
}

function expectClosedUnrewardedDueQuestQuery(query: unknown) {
  expect(query).toMatchObject({
    status: 'close',
    legacy_payout_reconciliation_status: 'ready',
    legacy_special_point_completed_at: { $exists: false },
    $and: [
      {
        $or: [
          { reward_model: { $exists: false } },
          { reward_model: 'legacy_v1' },
        ],
      },
      {
        $or: [
          { reward_distribution_mode: { $exists: false } },
          { reward_distribution_mode: 'campaign_end' },
          {
            reward_distribution_mode: 'after_days',
            reward_distribution_scheduled_at: { $lte: expect.any(Date) },
          },
        ],
      },
    ],
  });
}

function reconciledSpecialQuest(questId: Types.ObjectId) {
  const quest = {
    _id: questId,
    start_date: '2026-05-01',
    end_date: '2026-05-31',
    reward_model: 'legacy_v1',
    rewards: [],
    facebook_page: '',
    facebook_post: '',
    line: '',
    legacy_payout_reconciliation_status: 'ready',
    legacy_payout_reconciliation_version: 1,
    legacy_payout_config_checksum: '',
  };
  quest.legacy_payout_config_checksum = legacyQuestPayoutConfigChecksum(quest);
  return quest;
}

async function buildService(): Promise<{
  service: TasksService;
  mocks: Mocks;
}> {
  const conversionModel = {
    updateMany: jest
      .fn()
      .mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    }),
    updateOne: jest
      .fn()
      .mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
  };
  const offerModel = {};
  const manifestCollection = {
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest
      .fn()
      .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  };
  const questModel = {
    findOne: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
    db: { collection: jest.fn().mockReturnValue(manifestCollection) },
  };
  const { PointModel, constructed } = makePointModelMock();
  const involveService = { getConversionAll: jest.fn() };
  const conversionIngestService = {
    upsertConversion: jest.fn().mockResolvedValue(undefined),
  };
  const pointService = {
    getSpacialPointNextRound: jest.fn(),
    addPointsToUser: jest.fn().mockResolvedValue({}),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      TasksService,
      { provide: getModelToken(Conversion.name), useValue: conversionModel },
      { provide: getModelToken(Offer.name), useValue: offerModel },
      { provide: getModelToken(Quest.name), useValue: questModel },
      { provide: getModelToken(Point.name), useValue: PointModel },
      { provide: InvolveService, useValue: involveService },
      { provide: ConversionIngestService, useValue: conversionIngestService },
      { provide: PointService, useValue: pointService },
    ],
  }).compile();

  const service = moduleRef.get<TasksService>(TasksService);
  return {
    service,
    mocks: {
      conversionModel,
      questModel,
      manifestCollection,
      pointModel: PointModel,
      involveService,
      conversionIngestService,
      pointService,
      constructedPoints: constructed,
    },
  };
}

describe('TasksService', () => {
  // Console is noisy in the SUT; silence it so test output stays readable.
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('should be defined', async () => {
    const { service } = await buildService();
    expect(service).toBeDefined();
  });

  describe('changeConversionPaid', () => {
    it('routes every paid -> approved transition through the authoritative lifecycle', async () => {
      const { service, mocks } = await buildService();
      const conversions = [
        {
          _id: 'mongo-row-11',
          __v: 0,
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          updatedAt: new Date('2026-07-17T00:00:00.000Z'),
          conversion_id: 11,
          conversion_status: 'paid',
        },
        { conversion_id: 12, conversion_status: 'paid' },
      ];
      mocks.conversionModel.find.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(conversions),
      });

      await expect(service.changeConversionPaid()).resolves.toEqual({
        acknowledged: true,
        matchedCount: 2,
        modifiedCount: 2,
      });

      expect(mocks.conversionModel.find).toHaveBeenCalledWith({
        conversion_status: 'paid',
      });
      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenCalledTimes(2);
      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenNthCalledWith(
        1,
        { conversion_id: 11, conversion_status: 'approved' },
        { adapter: 'admin', authoritative: true },
      );
      expect(mocks.conversionModel.updateMany).not.toHaveBeenCalled();
    });

    it('does not directly mutate source rows when there are no paid conversions', async () => {
      const { service, mocks } = await buildService();

      await expect(service.changeConversionPaid()).resolves.toMatchObject({
        matchedCount: 0,
        modifiedCount: 0,
      });

      expect(
        mocks.conversionIngestService.upsertConversion,
      ).not.toHaveBeenCalled();
      expect(mocks.conversionModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('awardApprovedConversionPoints', () => {
    it('uses the canonical provider account identity and marks only after the Point write', async () => {
      const { service, mocks } = await buildService();
      const userId = new Types.ObjectId();
      mocks.conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'conversion-row',
            conversion_id: 701,
            provider_conversion_id: 'provider/701',
            source: 'involve',
            network_account: 'publisher-th',
            user_id: userId,
            currency: 'THB',
            sale_amount: 250.9,
            payout: 20,
            legacy_point_reconciliation_status: 'ready',
            legacy_point_reconciliation_version: 1,
            legacy_point_payout_key:
              'legacy:purchase:conversion:involve:publisher-th:provider%2F701',
            legacy_point_amount: 250,
          },
        ]),
      });

      await service.awardApprovedConversionPoints(
        new Date('2026-07-17T00:00:00.000Z'),
      );

      expect(mocks.pointService.addPointsToUser).toHaveBeenCalledWith(
        userId.toString(),
        250,
        701,
        undefined,
        'legacy:purchase:conversion:involve:publisher-th:provider%2F701',
      );
      expect(mocks.conversionModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: 'conversion-row',
          legacy_point_reconciliation_status: 'ready',
          legacy_point_payout_key:
            'legacy:purchase:conversion:involve:publisher-th:provider%2F701',
          legacy_point_amount: 250,
        }),
        {
          $set: expect.objectContaining({
            add_point: true,
            legacy_point_reconciliation_status: 'completed',
          }),
        },
      );
    });

    it('does not mark add_point after a failed ledger write', async () => {
      const { service, mocks } = await buildService();
      mocks.conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'conversion-row',
            conversion_id: 701,
            source: 'involve',
            aff_sub1: `user_id:${new Types.ObjectId()}`,
            currency: 'THB',
            sale_amount: 250,
            payout: 20,
            legacy_point_reconciliation_status: 'ready',
            legacy_point_reconciliation_version: 1,
            legacy_point_payout_key:
              'legacy:purchase:conversion:involve:default:701',
            legacy_point_amount: 250,
          },
        ]),
      });
      mocks.pointService.addPointsToUser.mockRejectedValue(
        new Error('ledger unavailable'),
      );

      await expect(service.awardApprovedConversionPoints()).rejects.toThrow(
        'ledger unavailable',
      );
      expect(mocks.conversionModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('updateStatusConversionIsPending', () => {
    // The job filters upstream by approved status and the customer ledger is
    // financial data — it must request the 'approved' filter, not anything else.
    it('updateStatusConversionIsPending > given approved conversions upstream > then it requests them with the approved filter', async () => {
      const { service, mocks } = await buildService();
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: [{ conversion_id: 1 }], nextPage: false },
      });

      await service.updateStatusConversionIsPending();

      expect(mocks.involveService.getConversionAll).toHaveBeenCalledTimes(1);
      const [page, filter] =
        mocks.involveService.getConversionAll.mock.calls[0];
      expect(page).toEqual({ page: 1, limit: 100 });
      expect(filter).toEqual({ conversion_status: 'approved' });
    });

    it('routes every authoritative pull through the conversion lifecycle', async () => {
      const { service, mocks } = await buildService();
      const conversions = [
        { conversion_id: 101, payout: 50 },
        { conversion_id: 102, payout: 75 },
      ];
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: conversions, nextPage: false },
      });

      await service.updateStatusConversionIsPending();

      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenCalledTimes(2);
      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenNthCalledWith(1, conversions[0]);
      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenNthCalledWith(2, conversions[1]);
      expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('updateStatusConversionIsPending > given upstream conversions > then it does not print raw conversion payloads', async () => {
      const { service, mocks } = await buildService();
      const conversions = [
        {
          conversion_id: 101,
          payout: 50,
          aff_sub1: 'user_id:507f1f77bcf86cd799439011',
        },
      ];
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: conversions, nextPage: false },
      });

      await service.updateStatusConversionIsPending();

      expect(logSpy).not.toHaveBeenCalledWith('batch', conversions);
    });

    // Pagination must follow `nextPage` until it is falsy and aggregate every
    // page — a dropped page would silently lose payouts.
    it('updateStatusConversionIsPending > given multiple pages > then it follows nextPage until exhausted and upserts all', async () => {
      const { service, mocks } = await buildService();
      mocks.involveService.getConversionAll
        .mockResolvedValueOnce({
          data: { data: [{ conversion_id: 1 }], nextPage: true },
        })
        .mockResolvedValueOnce({
          data: { data: [{ conversion_id: 2 }], nextPage: true },
        })
        .mockResolvedValueOnce({
          data: { data: [{ conversion_id: 3 }], nextPage: false },
        });

      await service.updateStatusConversionIsPending();

      expect(mocks.involveService.getConversionAll).toHaveBeenCalledTimes(3);
      // Page numbers increment 1,2,3 across the loop.
      expect(
        mocks.involveService.getConversionAll.mock.calls.map((c) => c[0].page),
      ).toEqual([1, 2, 3]);
      expect(
        mocks.conversionIngestService.upsertConversion,
      ).toHaveBeenCalledTimes(3);
      expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    // Empty result is the no-op guard: it must early-return before any write
    // so a quiet day never mutates the ledger.
    it('updateStatusConversionIsPending > given no conversions upstream > then it writes nothing', async () => {
      const { service, mocks } = await buildService();
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: [], nextPage: false },
      });

      await service.updateStatusConversionIsPending();

      expect(
        mocks.conversionIngestService.upsertConversion,
      ).not.toHaveBeenCalled();
      expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    // Error path: upstream failure must propagate (caught, logged, rethrown)
    // so the scheduler/caller sees the failure rather than a false success.
    it('updateStatusConversionIsPending > given the upstream service throws > then the error is rethrown', async () => {
      const { service, mocks } = await buildService();
      mocks.involveService.getConversionAll.mockRejectedValueOnce(
        new Error('involve down'),
      );

      await expect(service.updateStatusConversionIsPending()).rejects.toThrow(
        'involve down',
      );
      expect(mocks.conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getSpacialPointNextRound', () => {
    function setSpecialManifest(
      mocks: Mocks,
      questId: Types.ObjectId,
      recipients: Array<{
        user_id: string;
        amount: number;
        excluded?: boolean;
        exclusion_reason?: string;
      }>,
    ) {
      const quest = reconciledSpecialQuest(questId);
      const entries = recipients.map((recipient) => ({
        ...recipient,
        payout_key: legacySpecialPointKey(questId, recipient.user_id),
      }));
      const noRecipientReason =
        entries.length === 0
          ? 'Reviewed evidence found no recipients'
          : undefined;
      mocks.manifestCollection.findOne.mockResolvedValue({
        manifest_key: legacyRewardManifestKey(questId, 'special-next-round'),
        quest_id: questId.toString(),
        reward_type: 'special-next-round',
        reconciliation_version: 1,
        status: 'ready',
        recipients: entries,
        quest_config_checksum: quest.legacy_payout_config_checksum,
        ...(noRecipientReason
          ? { no_recipient_reason: noRecipientReason }
          : {}),
        manifest_hash: legacyRewardManifestHash(
          questId,
          'special-next-round',
          1,
          entries,
          noRecipientReason,
          quest.legacy_payout_config_checksum,
        ),
      });
    }
    // No eligible quest is a hard guard: the reward job must early-return and
    // never mint points when there is no closed/un-rewarded round.
    it('getSpacialPointNextRound > given no closed unrewarded quest > then it mints no points', async () => {
      const { service, mocks } = await buildService();
      mocks.questModel.findOne.mockResolvedValueOnce(null);

      await service.getSpacialPointNextRound();

      expect(
        mocks.pointService.getSpacialPointNextRound,
      ).not.toHaveBeenCalled();
      expect(mocks.pointModel).not.toHaveBeenCalled();
    });

    // The quest selection contract: only closed, not-yet-rewarded rounds whose
    // configured automatic distribution time is due are eligible.
    it('getSpacialPointNextRound > given a quest exists > then it selects a closed, not-yet-rewarded round', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValueOnce(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, []);

      await service.getSpacialPointNextRound();

      expectClosedUnrewardedDueQuestQuery(
        mocks.questModel.findOne.mock.calls[0][0],
      );
    });

    it('getSpacialPointNextRound > given a reward list > then it atomically writes one durable recipient identity per user', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValueOnce(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, [
        { user_id: userA.toString(), amount: 80 },
        { user_id: userB.toString(), amount: 110 },
      ]);

      await service.getSpacialPointNextRound();

      expect(mocks.pointService.addPointsToUser).toHaveBeenNthCalledWith(
        1,
        userA.toString(),
        80,
        0,
        'special_point_quest',
        `legacy:quest:${questId}:special-next-round:user:${userA}`,
      );
      expect(mocks.pointService.addPointsToUser).toHaveBeenNthCalledWith(
        2,
        userB.toString(),
        110,
        0,
        'special_point_quest',
        `legacy:quest:${questId}:special-next-round:user:${userB}`,
      );
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: questId,
          legacy_payout_reconciliation_status: 'ready',
          legacy_payout_reconciliation_version: 1,
          legacy_payout_config_checksum:
            reconciledSpecialQuest(questId).legacy_payout_config_checksum,
          legacy_special_point_completed_at: { $exists: false },
        },
        { $set: { legacy_special_point_completed_at: expect.any(Date) } },
        { new: true },
      );
    });

    // Defensive default: a missing/zero special_point_next_round must persist
    // as 0 points, never undefined/NaN, so the ledger stays numerically valid.
    it('getSpacialPointNextRound > given an entry without a reward amount > then it defaults the points to 0', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValueOnce(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, [
        { user_id: userId.toString(), amount: 0 },
      ]);

      await service.getSpacialPointNextRound();

      expect(mocks.pointService.addPointsToUser).toHaveBeenCalledWith(
        expect.any(String),
        0,
        0,
        'special_point_quest',
        expect.stringContaining('special-next-round'),
      );
    });

    it('getSpacialPointNextRound > given multiple entries > then each gets a distinct durable payout key', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const users = [
        new Types.ObjectId(),
        new Types.ObjectId(),
        new Types.ObjectId(),
      ];
      mocks.questModel.findOne.mockResolvedValueOnce(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(
        mocks,
        questId,
        users.map((user) => ({ user_id: user.toString(), amount: 30 })),
      );

      await service.getSpacialPointNextRound();

      const keys = mocks.pointService.addPointsToUser.mock.calls.map(
        (call) => call[4],
      );
      expect(new Set(keys).size).toBe(keys.length);
    });

    // Empty reward list (quest exists but nobody qualified) must mint nothing.
    it('getSpacialPointNextRound > given a quest but an empty reward list > then no points are saved', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValueOnce(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, []);

      await service.getSpacialPointNextRound();

      expect(mocks.pointModel).not.toHaveBeenCalled();
      expect(mocks.pointService.addPointsToUser).not.toHaveBeenCalled();
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('does not mark the quest complete when the immutable manifest hash fence is lost', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, [
        { user_id: userId.toString(), amount: 80 },
      ]);
      mocks.manifestCollection.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(service.getSpacialPointNextRound()).rejects.toThrow(
        /completion fence/i,
      );
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('fails closed before any payout when the immutable recipient manifest was tampered with', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const quest = reconciledSpecialQuest(questId);
      mocks.questModel.findOne.mockResolvedValue(quest);
      const originalRecipients = [
        {
          user_id: userId.toString(),
          amount: 80,
          payout_key: legacySpecialPointKey(questId, userId),
        },
      ];
      mocks.manifestCollection.findOne.mockResolvedValue({
        manifest_key: legacyRewardManifestKey(questId, 'special-next-round'),
        quest_id: questId.toString(),
        reward_type: 'special-next-round',
        reconciliation_version: 1,
        status: 'ready',
        recipients: [{ ...originalRecipients[0], amount: 8_000 }],
        quest_config_checksum: quest.legacy_payout_config_checksum,
        manifest_hash: legacyRewardManifestHash(
          questId,
          'special-next-round',
          1,
          originalRecipients,
          undefined,
          quest.legacy_payout_config_checksum,
        ),
      });

      await expect(service.getSpacialPointNextRound()).rejects.toThrow(
        /manifest hash mismatch/i,
      );
      expect(mocks.pointService.addPointsToUser).not.toHaveBeenCalled();
      expect(mocks.manifestCollection.updateOne).not.toHaveBeenCalled();
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('excludes task_v2 and missing reconciliation state in the database query', async () => {
      const { service, mocks } = await buildService();
      await service.getSpacialPointNextRound();

      const query = mocks.questModel.findOne.mock.calls[0][0];
      expect(JSON.stringify(query)).toContain('legacy_v1');
      expect(JSON.stringify(query)).not.toContain('task_v2');
      expect(query.legacy_payout_reconciliation_status).toBe('ready');
    });

    it('does not mark the round complete if a recipient write fails and retries use the same key', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, [
        { user_id: userId.toString(), amount: 80 },
      ]);
      mocks.pointService.addPointsToUser
        .mockRejectedValueOnce(new Error('crash after recipient claim'))
        .mockResolvedValueOnce({});

      await expect(service.getSpacialPointNextRound()).rejects.toThrow(
        'crash after recipient claim',
      );
      expect(mocks.questModel.findOneAndUpdate).not.toHaveBeenCalled();
      await expect(service.getSpacialPointNextRound()).resolves.toBeUndefined();

      expect(mocks.pointService.addPointsToUser.mock.calls[0][4]).toBe(
        mocks.pointService.addPointsToUser.mock.calls[1][4],
      );
      expect(mocks.questModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('ignores a changed live leaderboard and retries only the frozen manifest recipients', async () => {
      const { service, mocks } = await buildService();
      const questId = new Types.ObjectId();
      const frozenUser = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValue(
        reconciledSpecialQuest(questId),
      );
      setSpecialManifest(mocks, questId, [
        { user_id: frozenUser.toString(), amount: 80 },
      ]);
      mocks.pointService.getSpacialPointNextRound.mockResolvedValue([
        {
          user_id: new Types.ObjectId().toString(),
          special_point_next_round: 999,
        },
      ]);

      await service.getSpacialPointNextRound();

      expect(
        mocks.pointService.getSpacialPointNextRound,
      ).not.toHaveBeenCalled();
      expect(mocks.pointService.addPointsToUser).toHaveBeenCalledWith(
        frozenUser.toString(),
        80,
        0,
        'special_point_quest',
        legacySpecialPointKey(questId, frozenUser),
      );
    });
  });
});
