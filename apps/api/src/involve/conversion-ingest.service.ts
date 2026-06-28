import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import { enrichConversionWithUserId } from 'src/withdraw/conversion-user-id.util';
import {
  firstQueryValue,
  InvolvePostbackQuery,
  mapPostbackQueryToConversion,
  normalizeConversionStatus,
  sanitizePostbackQuery,
} from './involve-postback.mapper';

@Injectable()
export class ConversionIngestService {
  constructor(
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
  ) {}

  async resolveMerchantId(offerId: number): Promise<number> {
    const offer = await this.offerModel
      .findOne({ offer_id: offerId, source: 'involve' })
      .select('merchant_id')
      .lean();
    return offer?.merchant_id ?? 0;
  }

  async upsertFromPostback(
    query: InvolvePostbackQuery | Record<string, unknown>,
  ): Promise<'upserted' | 'skipped'> {
    const sanitized =
      typeof query === 'object' && query !== null && !Array.isArray(query)
        ? sanitizePostbackQuery(query as Record<string, unknown>)
        : {};
    const offerIdRaw = firstQueryValue(sanitized, 'offer_id');
    let merchantId = 0;
    if (offerIdRaw) {
      const offerId = Number.parseInt(offerIdRaw, 10);
      if (!Number.isNaN(offerId)) {
        merchantId = await this.resolveMerchantId(offerId);
      }
    }

    const payload = mapPostbackQueryToConversion(sanitized, merchantId);
    if (!payload) {
      return 'skipped';
    }

    await this.upsertConversion(payload);
    return 'upserted';
  }

  async upsertConversion(conversion: Record<string, unknown>): Promise<void> {
    const conversionId = conversion.conversion_id;
    if (conversionId === undefined || conversionId === null) {
      return;
    }

    const status =
      typeof conversion.conversion_status === 'string'
        ? conversion.conversion_status
        : undefined;
    const normalized: Record<string, unknown> = {
      ...conversion,
      conversion_status: normalizeConversionStatus(status),
    };

    const payload = normalized as Record<string, unknown> & {
      aff_sub1?: string;
      user_id?: import('mongoose').Types.ObjectId;
    };

    await this.conversionModel.findOneAndUpdate(
      { conversion_id: conversionId },
      enrichConversionWithUserId(payload),
      { upsert: true, new: true },
    );
  }
}
