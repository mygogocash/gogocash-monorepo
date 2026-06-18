import { TasksService } from './tasksService';

jest.mock('src/utils/helper', () => ({
  rateCurrencyUSD: jest.fn().mockResolvedValue({ THB: 35 }),
}));

describe('Point TasksService', () => {
  let service: TasksService;
  let pointService: { addPointsToUser: jest.Mock };
  let involveService: Record<string, never>;
  let conversionModel: { find: jest.Mock };

  beforeEach(() => {
    pointService = { addPointsToUser: jest.fn() };
    involveService = {};
    conversionModel = { find: jest.fn() };
    service = new TasksService(
      pointService as never,
      involveService as never,
      conversionModel as never,
    );
  });

  it('handleCron > given conversion lookup > then it only awards approved conversions that have not already received points', async () => {
    conversionModel.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });

    await service.handleCron();

    expect(conversionModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        aff_sub1: { $regex: '^user_id:' },
        conversion_status: 'approved',
        add_point: { $ne: true },
      }),
    );
    expect(pointService.addPointsToUser).not.toHaveBeenCalled();
  });
});
