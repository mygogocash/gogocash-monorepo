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
    service = new TasksService(pointService as never, conversionModel as never);
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
});
