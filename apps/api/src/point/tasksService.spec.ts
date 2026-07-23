import { TasksService } from './tasksService';

jest.mock('src/utils/helper', () => ({
  rateCurrencyUSD: jest.fn().mockResolvedValue({ THB: 35 }),
}));

describe('Point TasksService legacy purchase writer', () => {
  let service: TasksService;
  let pointService: { addPointsToUser: jest.Mock };
  let conversionModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    updateOne: jest.Mock;
    updateMany: jest.Mock;
  };

  const conversion = {
    _id: 'mongo-conversion-id',
    conversion_id: 701,
    source: 'involve',
    user_id: { toString: () => '507f1f77bcf86cd799439011' },
    sale_amount: 250.9,
    currency: 'THB',
    legacy_point_reconciliation_status: 'ready',
    legacy_point_reconciliation_version: 1,
    legacy_point_payout_key: 'legacy:purchase:conversion:involve:default:701',
    legacy_point_amount: 250,
  };

  beforeEach(() => {
    pointService = { addPointsToUser: jest.fn().mockResolvedValue({}) };
    conversionModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
      updateOne: jest
        .fn()
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };
    // Referral bonus is OFF by default (REFERRAL_BONUS_ENABLED unset), so the
    // hook short-circuits before touching these models — bare stubs suffice.
    const pointModel = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn() }),
    };
    const feeRateModel = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn() }),
    };
    const referralPayoutModel = { updateOne: jest.fn() };
    service = new TasksService(
      pointService as never,
      conversionModel as never,
      pointModel as never,
      feeRateModel as never,
      referralPayoutModel as never,
    );
  });

  describe('scheduledHandleCron CRON_ENABLED gate', () => {
    const originalCronEnabled = process.env.CRON_ENABLED;

    afterEach(() => {
      if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
      else process.env.CRON_ENABLED = originalCronEnabled;
    });

    it('given CRON_ENABLED=false > then skips the legacy point-award pass', async () => {
      process.env.CRON_ENABLED = 'false';
      const handleCron = jest
        .spyOn(service, 'handleCron')
        .mockResolvedValue(undefined);

      await service.scheduledHandleCron();

      expect(handleCron).not.toHaveBeenCalled();
    });

    it('given CRON_ENABLED unset > then delegates to handleCron once', async () => {
      delete process.env.CRON_ENABLED;
      const handleCron = jest
        .spyOn(service, 'handleCron')
        .mockResolvedValue(undefined);

      await service.scheduledHandleCron();

      expect(handleCron).toHaveBeenCalledTimes(1);
    });
  });

  it('queries only approved unmarked conversions and waits for every write', async () => {
    await service.handleCron();

    expect(conversionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        conversion_status: 'approved',
        add_point: { $ne: true },
        payout: { $gt: 0 },
        legacy_point_reconciliation_status: 'ready',
        legacy_point_reconciliation_version: 1,
        $or: expect.any(Array),
      }),
    );
    expect(pointService.addPointsToUser).not.toHaveBeenCalled();
    expect(conversionModel.updateMany).not.toHaveBeenCalled();
  });

  it('uses the same durable purchase key in concurrent workers', async () => {
    conversionModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([conversion]),
    });

    await Promise.all([service.handleCron(), service.handleCron()]);

    expect(pointService.addPointsToUser).toHaveBeenCalledTimes(2);
    for (const call of pointService.addPointsToUser.mock.calls) {
      expect(call).toEqual([
        '507f1f77bcf86cd799439011',
        250,
        701,
        undefined,
        'legacy:purchase:conversion:involve:default:701',
      ]);
    }
  });

  it('retries with the same key after the Point write succeeds but add_point marking crashes', async () => {
    conversionModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([conversion]),
    });
    conversionModel.updateOne
      .mockRejectedValueOnce(new Error('crash after point'))
      .mockResolvedValueOnce({ modifiedCount: 1, matchedCount: 1 });

    await expect(service.handleCron()).rejects.toThrow('crash after point');
    await expect(service.handleCron()).resolves.toBeUndefined();

    expect(pointService.addPointsToUser).toHaveBeenCalledTimes(2);
    expect(pointService.addPointsToUser.mock.calls[0][4]).toBe(
      pointService.addPointsToUser.mock.calls[1][4],
    );
  });

  it('namespaces identically numbered conversions by source', async () => {
    conversionModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        conversion,
        {
          ...conversion,
          _id: 'other',
          source: 'optimise',
          legacy_point_payout_key:
            'legacy:purchase:conversion:optimise:default:701',
        },
      ]),
    });

    await service.handleCron();

    expect(
      pointService.addPointsToUser.mock.calls.map((call) => call[4]),
    ).toEqual([
      'legacy:purchase:conversion:involve:default:701',
      'legacy:purchase:conversion:optimise:default:701',
    ]);
  });

  describe('referral bonus wiring (REFERRAL_BONUS_ENABLED)', () => {
    const original = process.env.REFERRAL_BONUS_ENABLED;
    afterEach(() => {
      if (original === undefined) delete process.env.REFERRAL_BONUS_ENABLED;
      else process.env.REFERRAL_BONUS_ENABLED = original;
    });

    it('credits the referrer their % after the referee cashback completes', async () => {
      process.env.REFERRAL_BONUS_ENABLED = 'true';
      const referrerId = '507f1f77bcf86cd7994390ff';
      const pointModel = {
        // referrerLookup: friend's signup referral row -> referrer user_id
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ user_id: referrerId }),
        }),
      };
      const feeRateModel = {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ referral_bonus_percent: 10 }),
        }),
      };
      const referralPayoutModel = {
        updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }),
      };
      const svc = new TasksService(
        pointService as never,
        conversionModel as never,
        pointModel as never,
        feeRateModel as never,
        referralPayoutModel as never,
      );
      conversionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([conversion]),
      });

      await svc.handleCron();

      // referee purchase credit + referrer bonus credit
      const calls = pointService.addPointsToUser.mock.calls;
      const bonusCall = calls.find((c) => c[3] === 'referral_bonus');
      expect(bonusCall).toBeDefined();
      expect(bonusCall[0]).toBe(referrerId);
      expect(bonusCall[1]).toBe(25); // floor(250 * 10%)
      expect(bonusCall[4]).toBe(
        'referral:bonus:v1:source:legacy:purchase:conversion:involve:default:701',
      );
      // one immutable audit row
      expect(referralPayoutModel.updateOne).toHaveBeenCalledTimes(1);
    });
  });
});
