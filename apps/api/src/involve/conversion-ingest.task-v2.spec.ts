import { QuestConversionLifecycleService } from 'src/quest-task-engine/conversion-lifecycle.service';

import { ConversionIngestService } from './conversion-ingest.service';

describe('ConversionIngestService task-v2 adapter', () => {
  const conversionModel = { findOneAndUpdate: jest.fn() };
  const offerModel = {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ merchant_id: 77 }),
      }),
    }),
  };
  const lifecycle = {
    ingest: jest.fn().mockResolvedValue({ outcome: 'applied' }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('routes authoritative pull records through the central lifecycle service', async () => {
    const service = new ConversionIngestService(
      conversionModel as never,
      offerModel as never,
      lifecycle as unknown as QuestConversionLifecycleService,
    );
    const payload = {
      conversion_id: 91,
      conversion_status: 'paid',
      offer_id: 10,
    };

    await service.upsertConversion(payload);

    expect(lifecycle.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ conversion_status: 'approved' }),
      { adapter: 'authoritative_pull', authoritative: true },
    );
    expect(conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('routes postback records as non-authoritative so ambiguous order is quarantined', async () => {
    const service = new ConversionIngestService(
      conversionModel as never,
      offerModel as never,
      lifecycle as unknown as QuestConversionLifecycleService,
    );

    await service.upsertFromPostback({
      conversion_id: '92',
      offer_id: '10',
      datetime_conversion: '2026-07-17 09:00:00',
      status: 'approved',
    });

    expect(lifecycle.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ conversion_id: 92 }),
      { adapter: 'postback', authoritative: false },
    );
  });
});
