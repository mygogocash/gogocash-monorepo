import { JobService } from './job.service';

describe('JobService conversion source writes', () => {
  it('routes provider-paid rows through ConversionIngestService without a bulk status mutation', async () => {
    const conversion = {
      conversion_id: 701,
      conversion_status: 'paid',
      datetime_conversion: new Date('2026-07-17T00:00:00.000Z'),
    };
    const involveService = {
      getConversionRange: jest.fn().mockResolvedValue({
        data: { data: [conversion], nextPage: false },
      }),
    };
    const conversionIngestService = {
      upsertConversion: jest.fn().mockResolvedValue(undefined),
    };
    const service = new JobService(
      involveService as never,
      conversionIngestService as never,
      {} as never,
    );
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await service.syncConversion();
    } finally {
      log.mockRestore();
    }

    expect(conversionIngestService.upsertConversion).toHaveBeenCalledTimes(1);
    expect(conversionIngestService.upsertConversion).toHaveBeenCalledWith(
      conversion,
    );
  });
});
