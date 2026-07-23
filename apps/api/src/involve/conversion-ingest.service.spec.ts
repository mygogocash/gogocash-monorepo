import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConversionIngestService } from './conversion-ingest.service';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { Types } from 'mongoose';

describe('ConversionIngestService', () => {
  let service: ConversionIngestService;
  let conversionModel: {
    findOneAndUpdate: jest.Mock;
  };
  let offerModel: {
    findOne: jest.Mock;
  };
  let analytics: { capture: jest.Mock };

  const HEX24 = '68bf99fed9667685c1637607';

  beforeEach(async () => {
    conversionModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };
    offerModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ merchant_id: 77 }),
        }),
      }),
    };
    analytics = { capture: jest.fn().mockResolvedValue(undefined) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ConversionIngestService,
        { provide: getModelToken(Conversion.name), useValue: conversionModel },
        { provide: getModelToken(Offer.name), useValue: offerModel },
        { provide: AnalyticsService, useValue: analytics },
      ],
    }).compile();

    service = moduleRef.get(ConversionIngestService);
  });

  describe('conversion_recorded analytics (PDPA-safe)', () => {
    const postback = (overrides: Record<string, string> = {}) => ({
      conversion_id: '9001',
      offer_id: '100',
      offer_name: 'Test Offer',
      datetime_conversion: '2026-06-01 10:00:00',
      payout_local: '3',
      sale_amount_local: '50',
      conversion_currency: 'THB',
      aff_sub: `user_id:${HEX24}`,
      status: 'pending',
      ...overrides,
    });

    it('captures conversion_recorded with source/status/offer/payout_band/has_user on a new postback', async () => {
      await service.upsertFromPostback(postback());

      expect(analytics.capture).toHaveBeenCalledWith(
        'conversion_recorded',
        expect.objectContaining({ userId: HEX24 }),
        expect.objectContaining({
          source: 'involve',
          status: 'pending',
          offer_id: 100,
          payout_band: '0-100',
          has_user: true,
        }),
      );
    });

    it('marks has_user false when aff_sub carries no resolvable user id', async () => {
      await service.upsertFromPostback(postback({ aff_sub: 'no-user-here' }));

      expect(analytics.capture).toHaveBeenCalledWith(
        'conversion_recorded',
        expect.anything(),
        expect.objectContaining({ has_user: false }),
      );
    });

    it('does NOT capture when the payload is skipped (non-numeric conversion_id)', async () => {
      const result = await service.upsertFromPostback(
        postback({ conversion_id: 'not-a-number' }),
      );

      expect(result).toBe('skipped');
      expect(analytics.capture).not.toHaveBeenCalled();
    });

    it('never puts raw aff_sub or sale/payout amounts in the event properties', async () => {
      await service.upsertFromPostback(postback());

      const props = analytics.capture.mock.calls[0]?.[2] ?? {};
      expect(props).not.toHaveProperty('aff_sub');
      expect(props).not.toHaveProperty('payout');
      expect(props).not.toHaveProperty('sale_amount');
    });
  });

  it('upsertFromPostback > given valid token payload > then upserts conversion with merchant_id from offer', async () => {
    const result = await service.upsertFromPostback({
      conversion_id: '9001',
      offer_id: '100',
      offer_name: 'Test Offer',
      datetime_conversion: '2026-06-01 10:00:00',
      payout_local: '3',
      sale_amount_local: '50',
      conversion_currency: 'THB',
      aff_sub: `user_id:${HEX24}`,
      status: 'pending',
    });

    expect(result).toBe('upserted');
    expect(offerModel.findOne).toHaveBeenCalledWith({
      offer_id: 100,
      source: 'involve',
    });
    expect(conversionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { conversion_id: 9001 },
      expect.objectContaining({
        conversion_id: 9001,
        merchant_id: 77,
        aff_sub1: `user_id:${HEX24}`,
        user_id: new Types.ObjectId(HEX24),
      }),
      { upsert: true, new: true },
    );
  });

  it('upsertFromPostback > given same conversion_id twice > then upserts twice (idempotent key)', async () => {
    await service.upsertFromPostback({
      conversion_id: '1',
      offer_id: '2',
      offer_name: 'Offer',
      datetime_conversion: '2026-06-01 10:00:00',
      status: 'pending',
    });
    await service.upsertFromPostback({
      conversion_id: '1',
      offer_id: '2',
      offer_name: 'Offer',
      datetime_conversion: '2026-06-01 10:00:00',
      status: 'approved',
    });

    expect(conversionModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(conversionModel.findOneAndUpdate.mock.calls[1][1]).toMatchObject({
      conversion_status: 'approved',
    });
  });

  it('upsertFromPostback > given missing conversion_id > then skips upsert', async () => {
    const result = await service.upsertFromPostback({ offer_id: '1' });

    expect(result).toBe('skipped');
    expect(conversionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
