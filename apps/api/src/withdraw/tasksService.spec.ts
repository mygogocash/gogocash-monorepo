import { TasksService } from './tasksService';

describe('Withdraw TasksService', () => {
  it('awaits the rank payout job so cron failures and leases are observable', async () => {
    let release!: () => void;
    const payout = new Promise<void>((resolve) => {
      release = resolve;
    });
    const withdrawService = {
      adminAddRewardConversionForQuest: jest.fn().mockReturnValue(payout),
    };
    const service = new TasksService(
      { syncConversion: jest.fn() } as never,
      withdrawService as never,
    );
    let settled = false;

    const running = service.addConversionReward().then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(
      withdrawService.adminAddRewardConversionForQuest,
    ).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);
    release();
    await running;
    expect(settled).toBe(true);
  });

  it('propagates rank payout failures instead of returning a false cron success', async () => {
    const service = new TasksService(
      { syncConversion: jest.fn() } as never,
      {
        adminAddRewardConversionForQuest: jest
          .fn()
          .mockRejectedValue(new Error('rank payout failed')),
      } as never,
    );

    await expect(service.addConversionReward()).rejects.toThrow(
      'rank payout failed',
    );
  });

  describe('CRON_ENABLED legacy-cron gate (dual-stack beta safety)', () => {
    const originalCronEnabled = process.env.CRON_ENABLED;

    afterEach(() => {
      if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
      else process.env.CRON_ENABLED = originalCronEnabled;
    });

    it('skips the 12h conversion sync when CRON_ENABLED=false', async () => {
      process.env.CRON_ENABLED = 'false';
      const jobService = { syncConversion: jest.fn() };
      const service = new TasksService(
        jobService as never,
        {
          adminAddRewardConversionForQuest: jest.fn(),
        } as never,
      );

      await service.handleCron();

      expect(jobService.syncConversion).not.toHaveBeenCalled();
    });

    it('skips the monthly rank payout when CRON_ENABLED=false', async () => {
      process.env.CRON_ENABLED = 'false';
      const withdrawService = {
        adminAddRewardConversionForQuest: jest.fn(),
      };
      const service = new TasksService(
        { syncConversion: jest.fn() } as never,
        withdrawService as never,
      );

      await service.addConversionReward();

      expect(
        withdrawService.adminAddRewardConversionForQuest,
      ).not.toHaveBeenCalled();
    });

    it('runs the conversion sync when CRON_ENABLED is unset', async () => {
      delete process.env.CRON_ENABLED;
      const jobService = {
        syncConversion: jest.fn().mockResolvedValue(undefined),
      };
      const service = new TasksService(
        jobService as never,
        {
          adminAddRewardConversionForQuest: jest.fn(),
        } as never,
      );

      await service.handleCron();

      expect(jobService.syncConversion).toHaveBeenCalledTimes(1);
    });
  });

  it('coalesces overlapping in-process cron/manual calls onto one bounded run', async () => {
    let release!: () => void;
    const payout = new Promise<void>((resolve) => {
      release = resolve;
    });
    const withdrawService = {
      adminAddRewardConversionForQuest: jest.fn().mockReturnValue(payout),
    };
    const service = new TasksService(
      { syncConversion: jest.fn() } as never,
      withdrawService as never,
    );

    const first = service.addConversionReward();
    const second = service.addConversionReward();
    await Promise.resolve();
    expect(
      withdrawService.adminAddRewardConversionForQuest,
    ).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
  });
});
