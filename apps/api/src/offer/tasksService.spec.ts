import { Logger } from '@nestjs/common';
import { TasksService } from './tasksService';

/**
 * The monthly offer-sync cron now dispatches across every enabled affiliate
 * provider through the registry, instead of calling InvolveService directly.
 */
describe('Offer TasksService', () => {
  let offerService: Record<string, never>;
  let registry: { enabledProviders: jest.Mock };
  let service: TasksService;
  let errorSpy: jest.SpyInstance;

  const provider = (
    source: string,
    syncOffers: jest.Mock,
  ): { source: string; syncOffers: jest.Mock } => ({ source, syncOffers });

  beforeEach(() => {
    offerService = {};
    registry = { enabledProviders: jest.fn().mockReturnValue([]) };
    service = new TasksService(offerService as never, registry as never);
    // Silence + observe the cron's own loggers.
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handleCron > given multiple enabled providers > then it syncs each one', async () => {
    const involve = provider(
      'involve',
      jest.fn().mockResolvedValue({ upserted: 5 }),
    );
    const optimise = provider(
      'optimise',
      jest.fn().mockResolvedValue({ upserted: 2 }),
    );
    registry.enabledProviders.mockReturnValue([involve, optimise]);

    await service.handleCron();

    expect(involve.syncOffers).toHaveBeenCalledTimes(1);
    expect(optimise.syncOffers).toHaveBeenCalledTimes(1);
  });

  // Error isolation is the whole point of the per-provider try/catch: one
  // network being down must never skip the healthy ones.
  it('handleCron > given the first provider throws > then the remaining providers still sync and the run does not throw', async () => {
    const failing = provider(
      'involve',
      jest.fn().mockRejectedValue(new Error('involve upstream down')),
    );
    const healthy = provider(
      'optimise',
      jest.fn().mockResolvedValue({ upserted: 3 }),
    );
    registry.enabledProviders.mockReturnValue([failing, healthy]);

    await expect(service.handleCron()).resolves.toBeUndefined();

    expect(failing.syncOffers).toHaveBeenCalledTimes(1);
    expect(healthy.syncOffers).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('handleCron > given no enabled providers > then it is a no-op', async () => {
    registry.enabledProviders.mockReturnValue([]);

    await expect(service.handleCron()).resolves.toBeUndefined();
  });
});
