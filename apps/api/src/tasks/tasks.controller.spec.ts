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
      | 'awardApprovedConversionPoints'
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
      awardApprovedConversionPoints: jest
        .fn()
        .mockResolvedValue({ scanned: 0 }),
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
    it('updatePoints > given a wrong api key > then no points are awarded', async () => {
      const result = await controller.updatePoints(WRONG_KEY);

      expect(result).toEqual({ message: 'error' });
      expect(tasksService.awardApprovedConversionPoints).not.toHaveBeenCalled();
    });

    it('updatePoints > given the correct api key > then it awaits the shared exact-once writer', async () => {
      tasksService.awardApprovedConversionPoints.mockResolvedValue({
        scanned: 2,
      });

      await expect(controller.updatePoints(VALID_KEY)).resolves.toEqual({
        scanned: 2,
      });
      expect(tasksService.awardApprovedConversionPoints).toHaveBeenCalledTimes(
        1,
      );
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
