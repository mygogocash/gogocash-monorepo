import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AffiliateProviderRegistry } from 'src/affiliate/affiliate-provider.registry';
import { PointService } from 'src/point/point.service';
import { JobService } from 'src/withdraw/cronjob/job.service';
import { WithdrawService } from 'src/withdraw/withdraw.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { AuthAdminGuard } from 'src/admin/jwt-auth-admin.guard';
import { RateLimitGuard } from 'src/auth/rate-limit.guard';
import * as helper from 'src/utils/helper';

// `rateCurrencyUSD` does a live HTTP fetch to an exchange-rate API. It is the
// only non-injected dependency in the controller, so we mock it at the module
// seam to keep the suite fast, deterministic, and offline (FIRST).
jest.mock('src/utils/helper', () => ({
  rateCurrencyUSD: jest.fn(),
}));

const VALID_KEY = 'test-firebase-api-key';
const WRONG_KEY = 'definitely-not-the-key';

type LeanQuery = { lean: jest.Mock };

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<
    Pick<
      TasksService,
      | 'changeConversionPaid'
      | 'updateStatusConversionIsPending'
      | 'getSpacialPointNextRound'
    >
  >;
  let involveProvider: { source: string; syncOffers: jest.Mock };
  let registry: { enabledProviders: jest.Mock };
  let pointService: { addPointsToUser: jest.Mock };
  let jobService: { syncConversion: jest.Mock };
  let withdrawService: { adminAddRewardConversionForQuest: jest.Mock };
  let conversionModel: { find: jest.Mock; updateOne: jest.Mock };
  let leanQuery: LeanQuery;
  const rateCurrencyUSD = helper.rateCurrencyUSD as jest.Mock;

  const originalKey = process.env.FIREBASE_API_KEY;

  beforeEach(async () => {
    process.env.FIREBASE_API_KEY = VALID_KEY;

    leanQuery = { lean: jest.fn().mockResolvedValue([]) };
    conversionModel = {
      find: jest.fn().mockReturnValue(leanQuery),
      updateOne: jest.fn().mockResolvedValue({}),
    };
    tasksService = {
      changeConversionPaid: jest.fn().mockResolvedValue({ modifiedCount: 3 }),
      updateStatusConversionIsPending: jest.fn().mockResolvedValue(undefined),
      getSpacialPointNextRound: jest.fn().mockResolvedValue(undefined),
    };
    involveProvider = {
      source: 'involve',
      syncOffers: jest.fn().mockResolvedValue({ upserted: 1 }),
    };
    registry = {
      enabledProviders: jest.fn().mockReturnValue([involveProvider]),
    };
    pointService = { addPointsToUser: jest.fn().mockResolvedValue(undefined) };
    jobService = { syncConversion: jest.fn().mockResolvedValue(undefined) };
    withdrawService = {
      adminAddRewardConversionForQuest: jest.fn().mockResolvedValue(undefined),
    };
    rateCurrencyUSD.mockResolvedValue({ THB: 35 });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: tasksService },
        { provide: AffiliateProviderRegistry, useValue: registry },
        { provide: PointService, useValue: pointService },
        { provide: JobService, useValue: jobService },
        { provide: WithdrawService, useValue: withdrawService },
        { provide: getModelToken(Conversion.name), useValue: conversionModel },
      ],
    })
      // The class-level admin JWT + rate-limit guards are a separate auth seam
      // (covered by their own specs). This spec isolates the controller's own
      // FIREBASE_API_KEY body check + delegation, so the guards are no-ops here.
      .overrideGuard(AuthAdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get<TasksController>(TasksController);
  });

  afterEach(() => {
    process.env.FIREBASE_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateOffers', () => {
    it('updateOffers > given the correct api key > then it syncs every enabled affiliate provider', async () => {
      await controller.updateOffers(VALID_KEY);

      expect(registry.enabledProviders).toHaveBeenCalledTimes(1);
      expect(involveProvider.syncOffers).toHaveBeenCalledTimes(1);
    });

    // The previous gate was a PUBLIC client key, so any caller could trigger
    // these admin break-glass routes. A wrong key must be fully inert.
    it('updateOffers > given a wrong api key > then it returns an error and never syncs', async () => {
      const result = await controller.updateOffers(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(registry.enabledProviders).not.toHaveBeenCalled();
      expect(involveProvider.syncOffers).not.toHaveBeenCalled();
    });
  });

  describe('updatePoints', () => {
    const baseConversion = {
      _id: 'conv-mongo-1',
      conversion_id: 9001,
      aff_sub1: 'user_id:64aaaaaaaaaaaaaaaaaaaaaa',
      currency: 'THB',
      sale_amount: 250,
    };

    it('updatePoints > given a wrong api key > then no points are awarded and no query runs', async () => {
      const result = await controller.updatePoints(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(conversionModel.find).not.toHaveBeenCalled();
      expect(pointService.addPointsToUser).not.toHaveBeenCalled();
    });

    // Idempotency is the money-safety contract: only approved, not-yet-pointed
    // conversions may be awarded, otherwise every call double-credits users.
    it('updatePoints > given the correct api key > then it queries only approved, un-pointed conversions', async () => {
      await controller.updatePoints(VALID_KEY);

      expect(conversionModel.find).toHaveBeenCalledTimes(1);
      const filter = conversionModel.find.mock.calls[0][0] as Record<
        string,
        unknown
      >;
      expect(filter).toMatchObject({
        conversion_status: 'approved',
        add_point: { $exists: false },
      });
      expect(filter.payout).toEqual({ $gt: 0 });
    });

    // THB conversions are credited at face value (no FX) and floored to a whole
    // point — 250 THB sale -> 250 points, awarded under the parsed user id.
    it('updatePoints > given a THB conversion > then points equal the floored sale amount and the user id is parsed from aff_sub1', async () => {
      leanQuery.lean.mockResolvedValue([
        { ...baseConversion, sale_amount: 250.9 },
      ]);

      await controller.updatePoints(VALID_KEY);

      expect(pointService.addPointsToUser).toHaveBeenCalledTimes(1);
      expect(pointService.addPointsToUser).toHaveBeenCalledWith(
        '64aaaaaaaaaaaaaaaaaaaaaa',
        250,
        9001,
      );
    });

    // USD conversions must be converted to THB using the fetched rate before
    // crediting; a wrong rate here would mis-pay every USD earner.
    it('updatePoints > given a USD conversion > then points are sale_amount * THB rate, floored', async () => {
      rateCurrencyUSD.mockResolvedValue({ THB: 35 });
      leanQuery.lean.mockResolvedValue([
        { ...baseConversion, currency: 'USD', sale_amount: 10.2 },
      ]);

      await controller.updatePoints(VALID_KEY);

      // 10.2 * 35 = 357 -> floor 357
      expect(pointService.addPointsToUser).toHaveBeenCalledWith(
        '64aaaaaaaaaaaaaaaaaaaaaa',
        357,
        9001,
      );
    });

    // After awarding, the conversion MUST be flagged add_point:true so the next
    // run's idempotency filter excludes it. This is the second half of the
    // double-credit guard.
    it('updatePoints > given an awarded conversion > then it is marked add_point:true to prevent re-award', async () => {
      leanQuery.lean.mockResolvedValue([baseConversion]);

      await controller.updatePoints(VALID_KEY);

      expect(conversionModel.updateOne).toHaveBeenCalledTimes(1);
      expect(conversionModel.updateOne).toHaveBeenCalledWith(
        { _id: 'conv-mongo-1' },
        { $set: { add_point: true } },
      );
    });

    it('updatePoints > given no matching conversions > then nothing is awarded or marked', async () => {
      leanQuery.lean.mockResolvedValue([]);

      await controller.updatePoints(VALID_KEY);

      expect(pointService.addPointsToUser).not.toHaveBeenCalled();
      expect(conversionModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('updateConversions', () => {
    it('updateConversions > given the correct api key > then it triggers the sync job', async () => {
      await controller.updateConversions(VALID_KEY);

      expect(jobService.syncConversion).toHaveBeenCalledTimes(1);
    });

    it('updateConversions > given a wrong api key > then the sync job never runs', async () => {
      const result = await controller.updateConversions(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(jobService.syncConversion).not.toHaveBeenCalled();
    });
  });

  describe('addConversionReward', () => {
    it('addConversionReward > given the correct api key > then the quest reward job is invoked', async () => {
      await controller.addConversionReward(VALID_KEY);

      expect(
        withdrawService.adminAddRewardConversionForQuest,
      ).toHaveBeenCalledTimes(1);
    });

    it('addConversionReward > given a wrong api key > then the quest reward job never runs', async () => {
      const result = await controller.addConversionReward(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(
        withdrawService.adminAddRewardConversionForQuest,
      ).not.toHaveBeenCalled();
    });
  });

  describe('changeConversionPaid', () => {
    it('changeConversionPaid > given the correct api key > then it delegates to TasksService', async () => {
      await controller.changeConversionPaid(VALID_KEY);

      expect(tasksService.changeConversionPaid).toHaveBeenCalledTimes(1);
    });

    it('changeConversionPaid > given a wrong api key > then the service is not called', async () => {
      const result = await controller.changeConversionPaid(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(tasksService.changeConversionPaid).not.toHaveBeenCalled();
    });
  });

  describe('updateStatusConversionIsPending', () => {
    it('updateStatusConversionIsPending > given the correct api key > then it returns the service result', async () => {
      tasksService.updateStatusConversionIsPending.mockResolvedValue({
        done: true,
      } as never);

      const result =
        await controller.updateStatusConversionIsPending(VALID_KEY);

      expect(
        tasksService.updateStatusConversionIsPending,
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ done: true });
    });

    it('updateStatusConversionIsPending > given a wrong api key > then the service is not called', async () => {
      const result =
        await controller.updateStatusConversionIsPending(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(
        tasksService.updateStatusConversionIsPending,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getSpacialPointNextRound', () => {
    it('getSpacialPointNextRound > given the correct api key > then it returns the service result', async () => {
      tasksService.getSpacialPointNextRound.mockResolvedValue([
        { user_id: 'u1' },
      ] as never);

      const result = await controller.getSpacialPointNextRound(VALID_KEY);

      expect(tasksService.getSpacialPointNextRound).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ user_id: 'u1' }]);
    });

    it('getSpacialPointNextRound > given a wrong api key > then the service is not called', async () => {
      const result = await controller.getSpacialPointNextRound(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(tasksService.getSpacialPointNextRound).not.toHaveBeenCalled();
    });
  });
});
