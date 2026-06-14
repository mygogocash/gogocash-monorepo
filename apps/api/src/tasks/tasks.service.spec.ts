import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { TasksService } from './tasks.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { Quest } from 'src/point/schemas/quest.schema';
import { Point } from 'src/point/schemas/point.schema';
import { InvolveService } from 'src/involve/involve.service';
import { PointService } from 'src/point/point.service';

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
  };
  questModel: { findOne: jest.Mock };
  pointModel: jest.Mock;
  involveService: { getConversionAll: jest.Mock };
  pointService: { getSpacialPointNextRound: jest.Mock };
  constructedPoints: Array<{ data: Record<string, unknown>; save: jest.Mock }>;
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
  };
  const offerModel = {};
  const questModel = { findOne: jest.fn().mockResolvedValue(null) };
  const { PointModel, constructed } = makePointModelMock();
  const involveService = { getConversionAll: jest.fn() };
  const pointService = { getSpacialPointNextRound: jest.fn() };

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      TasksService,
      { provide: getModelToken(Conversion.name), useValue: conversionModel },
      { provide: getModelToken(Offer.name), useValue: offerModel },
      { provide: getModelToken(Quest.name), useValue: questModel },
      { provide: getModelToken(Point.name), useValue: PointModel },
      { provide: InvolveService, useValue: involveService },
      { provide: PointService, useValue: pointService },
    ],
  }).compile();

  const service = moduleRef.get<TasksService>(TasksService);
  return {
    service,
    mocks: {
      conversionModel,
      questModel,
      pointModel: PointModel,
      involveService,
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
    // Money-status correctness: this bulk job must only touch rows already
    // marked 'paid' and must flip them to exactly 'approved' — a wrong filter
    // or wrong target status would mis-state payouts across the whole ledger.
    it('changeConversionPaid > given paid conversions > then it flips only paid -> approved', async () => {
      const { service, mocks } = await buildService();

      await service.changeConversionPaid();

      expect(mocks.conversionModel.updateMany).toHaveBeenCalledTimes(1);
      const [filter, update] = mocks.conversionModel.updateMany.mock.calls[0];
      expect(filter).toEqual({ conversion_status: 'paid' });
      expect(update).toEqual({ $set: { conversion_status: 'approved' } });
    });

    it('changeConversionPaid > given the model returns a write result > then it is returned to the caller', async () => {
      const { service, mocks } = await buildService();
      const writeResult = { matchedCount: 5, modifiedCount: 5 };
      mocks.conversionModel.updateMany.mockResolvedValueOnce(writeResult);

      const result = await service.changeConversionPaid();

      expect(result).toBe(writeResult);
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

    // Idempotency: every conversion must be persisted with upsert keyed by its
    // conversion_id, so re-running the job never duplicates a payout row.
    it('updateStatusConversionIsPending > given a single page of conversions > then each is upserted by conversion_id', async () => {
      const { service, mocks } = await buildService();
      const conversions = [
        { conversion_id: 101, payout: 50 },
        { conversion_id: 102, payout: 75 },
      ];
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: conversions, nextPage: false },
      });

      await service.updateStatusConversionIsPending();

      expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
      const firstCall = mocks.conversionModel.findOneAndUpdate.mock.calls[0];
      expect(firstCall[0]).toEqual({ conversion_id: 101 });
      expect(firstCall[1]).toEqual(conversions[0]);
      expect(firstCall[2]).toEqual({ upsert: true, new: true });
      const secondCall = mocks.conversionModel.findOneAndUpdate.mock.calls[1];
      expect(secondCall[0]).toEqual({ conversion_id: 102 });
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
      expect(mocks.conversionModel.findOneAndUpdate).toHaveBeenCalledTimes(3);
    });

    // Empty result is the no-op guard: it must early-return before any write
    // so a quiet day never mutates the ledger.
    it('updateStatusConversionIsPending > given no conversions upstream > then it writes nothing', async () => {
      const { service, mocks } = await buildService();
      mocks.involveService.getConversionAll.mockResolvedValueOnce({
        data: { data: [], nextPage: false },
      });

      await service.updateStatusConversionIsPending();

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

    // The quest selection contract: only rounds with status 'close' and
    // reward_status not yet true are eligible (prevents double-rewarding).
    it('getSpacialPointNextRound > given a quest exists > then it selects a closed, not-yet-rewarded round', async () => {
      const { service, mocks } = await buildService();
      mocks.questModel.findOne.mockResolvedValueOnce({
        start_date: '2026-05-01',
        end_date: '2026-05-31',
      });
      mocks.pointService.getSpacialPointNextRound.mockResolvedValueOnce([]);

      await service.getSpacialPointNextRound();

      expect(mocks.questModel.findOne).toHaveBeenCalledWith({
        status: 'close',
        reward_status: { $ne: true },
      });
    });

    // Reward correctness: each leaderboard entry must produce exactly one Point
    // doc with the user's special_point_next_round amount, an 'add' type and the
    // 'special_point_quest' action, then be persisted via .save().
    it('getSpacialPointNextRound > given a reward list > then it saves one add-point entry per user with the correct amount', async () => {
      const { service, mocks } = await buildService();
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      mocks.questModel.findOne.mockResolvedValueOnce({
        start_date: '2026-05-01',
        end_date: '2026-05-31',
      });
      mocks.pointService.getSpacialPointNextRound.mockResolvedValueOnce([
        { user_id: userA.toString(), special_point_next_round: 80 },
        { user_id: userB.toString(), special_point_next_round: 110 },
      ]);

      await service.getSpacialPointNextRound();

      expect(mocks.pointModel).toHaveBeenCalledTimes(2);
      expect(mocks.constructedPoints).toHaveLength(2);

      const [first, second] = mocks.constructedPoints;
      expect(first.data).toMatchObject({
        point: 80,
        type: 'add',
        action: 'special_point_quest',
      });
      expect((first.data.user_id as Types.ObjectId).toString()).toBe(
        userA.toString(),
      );
      expect(first.save).toHaveBeenCalledTimes(1);

      expect(second.data).toMatchObject({
        point: 110,
        type: 'add',
        action: 'special_point_quest',
      });
      expect(second.save).toHaveBeenCalledTimes(1);
    });

    // Defensive default: a missing/zero special_point_next_round must persist
    // as 0 points, never undefined/NaN, so the ledger stays numerically valid.
    it('getSpacialPointNextRound > given an entry without a reward amount > then it defaults the points to 0', async () => {
      const { service, mocks } = await buildService();
      mocks.questModel.findOne.mockResolvedValueOnce({
        start_date: '2026-05-01',
        end_date: '2026-05-31',
      });
      mocks.pointService.getSpacialPointNextRound.mockResolvedValueOnce([
        { user_id: new Types.ObjectId().toString() },
      ]);

      await service.getSpacialPointNextRound();

      expect(mocks.constructedPoints).toHaveLength(1);
      expect(mocks.constructedPoints[0].data.point).toBe(0);
    });

    // conversion_id is a per-entry synthetic unique key (timestamp + index);
    // distinct entries must not collide, otherwise upserts elsewhere clobber.
    it('getSpacialPointNextRound > given multiple entries > then each gets a distinct conversion_id', async () => {
      const { service, mocks } = await buildService();
      mocks.questModel.findOne.mockResolvedValueOnce({
        start_date: '2026-05-01',
        end_date: '2026-05-31',
      });
      mocks.pointService.getSpacialPointNextRound.mockResolvedValueOnce([
        {
          user_id: new Types.ObjectId().toString(),
          special_point_next_round: 30,
        },
        {
          user_id: new Types.ObjectId().toString(),
          special_point_next_round: 30,
        },
        {
          user_id: new Types.ObjectId().toString(),
          special_point_next_round: 30,
        },
      ]);

      await service.getSpacialPointNextRound();

      const ids = mocks.constructedPoints.map((p) => p.data.conversion_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    // Empty reward list (quest exists but nobody qualified) must mint nothing.
    it('getSpacialPointNextRound > given a quest but an empty reward list > then no points are saved', async () => {
      const { service, mocks } = await buildService();
      mocks.questModel.findOne.mockResolvedValueOnce({
        start_date: '2026-05-01',
        end_date: '2026-05-31',
      });
      mocks.pointService.getSpacialPointNextRound.mockResolvedValueOnce([]);

      await service.getSpacialPointNextRound();

      expect(mocks.pointModel).not.toHaveBeenCalled();
    });
  });
});
