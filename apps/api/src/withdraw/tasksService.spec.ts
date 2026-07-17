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
