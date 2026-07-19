import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversion } from 'src/withdraw/schemas/conversion.schema';
import { Offer } from 'src/offer/schemas/offer.schema';
import {
  enrichConversionWithUserId,
  parseUserIdFromAffSub1,
} from 'src/withdraw/conversion-user-id.util';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { amountBand } from 'src/analytics/amount-band';
import {
  firstQueryValue,
  InvolvePostbackQuery,
  mapPostbackQueryToConversion,
  normalizeConversionStatus,
  sanitizePostbackQuery,
} from './involve-postback.mapper';
import {
  ConversionLifecycleOptions,
  QuestConversionLifecycleService,
} from 'src/quest-task-engine/conversion-lifecycle.service';

@Injectable()
export class ConversionIngestService {
  constructor(
    @InjectModel(Conversion.name)
    private readonly conversionModel: Model<Conversion>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @Optional()
    private readonly lifecycleService?: QuestConversionLifecycleService,
    @Optional()
    private readonly analytics?: AnalyticsService,
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

    await this.upsertConversion(payload, {
      adapter: 'postback',
      authoritative: false,
    });

    this.captureConversionRecorded(sanitized, payload);
    return 'upserted';
  }

  /**
   * PDPA-safe conversion event. Emitted when a postback is accepted (mapped and
   * upserted). Carries only source/status/offer + a coarse payout band and a
   * has_user boolean — never the raw aff_sub, sale amount, or payout value. The
   * distinct_id is the resolved Mongo user id when aff_sub encodes one, so the
   * conversion stitches to the same person as the user's client/server events.
   */
  private captureConversionRecorded(
    sanitized: InvolvePostbackQuery,
    payload: Record<string, unknown>,
  ): void {
    if (!this.analytics) return;
    const affSub = firstQueryValue(sanitized, 'aff_sub', 'aff_sub1');
    const userId = parseUserIdFromAffSub1(affSub);
    void this.analytics.capture(
      'conversion_recorded',
      { userId: userId ?? undefined, platform: 'api' },
      {
        source: 'involve',
        status: payload.conversion_status,
        offer_id: payload.offer_id,
        payout_band: amountBand(
          typeof payload.payout === 'number' ? payload.payout : undefined,
        ),
        has_user: userId !== null,
      },
    );
  }

  async upsertConversion(
    conversion: Record<string, unknown>,
    lifecycleOptions: ConversionLifecycleOptions = {
      adapter: 'authoritative_pull',
      authoritative: true,
    },
  ): Promise<void> {
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

    if (this.lifecycleService) {
      await this.lifecycleService.ingest(
        enrichConversionWithUserId(payload),
        lifecycleOptions,
      );
      return;
    }

    await this.conversionModel.findOneAndUpdate(
      { conversion_id: conversionId },
      enrichConversionWithUserId(payload),
      { upsert: true, new: true },
    );
  }
}
