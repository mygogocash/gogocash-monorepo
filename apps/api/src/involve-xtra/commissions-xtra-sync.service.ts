import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model, Types } from 'mongoose';

import { AnalyticsService } from '../analytics/analytics.service';
import { InvolveService } from '../involve/involve.service';
import { Offer } from '../offer/schemas/offer.schema';
import {
  INVOLVE_CAMPAIGN_SOURCE,
  InvolveCampaign,
} from './schemas/involve-campaign.schema';
import {
  INVOLVE_SHOP_SOURCE,
  InvolveShop,
} from './schemas/involve-shop.schema';
import {
  type CampaignRow,
  mapCampaignRow,
  mapShopeeXtraRow,
  type ShopeeXtraRow,
} from './involve-xtra.mappers';

const INVOLVE_ENDPOINT = 'https://api.involve.asia/api';
// REQ-CFG-2 — explicit per-request timeout (the existing sync calls have none).
const XTRA_TIMEOUT_MS = 15_000;
// Backoff steps on HTTP 429 (REQ-SYNC-6).
const RATE_LIMIT_BACKOFF_MS = [250, 500, 1000];
// Safety cap so a malformed envelope can never loop forever.
const MAX_PAGES = 100;

export interface XtraSyncSummary {
  source: string;
  pages: number;
  fetched: number;
  upserted: number;
  skipped: number;
  softDeleted: number;
}

interface InvolveEnvelope<T> {
  data?: {
    page?: number;
    limit?: number;
    count?: number;
    nextPage?: number | null;
    data?: T[];
  };
}

// #586 REQ-SYNC-1 — deliberately NOT on the AffiliateNetworkProvider port (that
// port is offers/mint/refresh only). Standalone service; reuses InvolveService's
// token cache for auth (REQ-CFG-1).
@Injectable()
export class CommissionsXtraSyncService {
  private readonly logger = new Logger(CommissionsXtraSyncService.name);

  constructor(
    @InjectModel(InvolveShop.name)
    private readonly shopModel: Model<InvolveShop>,
    @InjectModel(InvolveCampaign.name)
    private readonly campaignModel: Model<InvolveCampaign>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    private readonly involve: InvolveService,
    private readonly analytics: AnalyticsService,
  ) {}

  /** REQ-SYNC-1 — Shopee Commission Xtra shops (Thailand, v1). */
  async syncShopeeXtra(): Promise<XtraSyncSummary> {
    const now = new Date();
    const { rows, pages } = await this.fetchAllPages<ShopeeXtraRow>(
      '/shopeextra/all',
      { filters: { country: 'Thailand', sort_type: 'default' }, limit: 200 },
    );

    const seenShopIds: number[] = [];
    let upserted = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped = mapShopeeXtraRow(raw);
      if (!mapped) {
        skipped += 1;
        continue;
      }
      const offerId = await this.resolveOfferId(
        mapped.parentOfferName,
        mapped.country,
      );
      await this.shopModel.updateOne(
        { source: mapped.source, shopId: mapped.shopId },
        { $set: { ...mapped, offerId, active: true, syncedAt: now } },
        { upsert: true },
      );
      seenShopIds.push(mapped.shopId);
      upserted += 1;
    }

    const softDeleted = await this.softDeleteMissingShops(seenShopIds, now);
    const summary: XtraSyncSummary = {
      source: INVOLVE_SHOP_SOURCE,
      pages,
      fetched: rows.length,
      upserted,
      skipped,
      softDeleted,
    };
    await this.emitSummary(summary);
    return summary;
  }

  /** REQ-SYNC-2 — voucher campaigns (coupons only). */
  async syncCampaigns(): Promise<XtraSyncSummary> {
    const now = new Date();
    const { rows, pages } = await this.fetchAllPages<CampaignRow>(
      '/campaigns/all',
      { filters: { coupons_only: true, country: 'Thailand' }, limit: 100 },
    );

    const seenIds: number[] = [];
    let upserted = 0;
    let skipped = 0;
    for (const raw of rows) {
      const mapped = mapCampaignRow(raw);
      if (!mapped) {
        skipped += 1;
        continue;
      }
      const offerId = await this.resolveOfferId(mapped.offerName, undefined);
      await this.campaignModel.updateOne(
        { source: mapped.source, campaignBannerId: mapped.campaignBannerId },
        { $set: { ...mapped, offerId, active: true, syncedAt: now } },
        { upsert: true },
      );
      seenIds.push(mapped.campaignBannerId);
      upserted += 1;
    }

    const softDeleted = await this.softDeleteMissingCampaigns(seenIds, now);
    const summary: XtraSyncSummary = {
      source: INVOLVE_CAMPAIGN_SOURCE,
      pages,
      fetched: rows.length,
      upserted,
      skipped,
      softDeleted,
    };
    await this.emitSummary(summary);
    return summary;
  }

  // REQ-SYNC-4 — only run the soft-delete sweep when the sync returned rows;
  // an empty feed (transient upstream hiccup) must NOT disable the whole set.
  private async softDeleteMissingShops(
    seenShopIds: number[],
    now: Date,
  ): Promise<number> {
    if (seenShopIds.length === 0) {
      this.logger.warn(
        'shopeextra sync returned 0 shops; skipping soft-delete sweep (empty-guard)',
      );
      return 0;
    }
    const res = await this.shopModel.updateMany(
      {
        source: INVOLVE_SHOP_SOURCE,
        shopId: { $nin: seenShopIds },
        active: true,
      },
      { $set: { active: false, syncedAt: now } },
    );
    return res.modifiedCount ?? 0;
  }

  private async softDeleteMissingCampaigns(
    seenIds: number[],
    now: Date,
  ): Promise<number> {
    if (seenIds.length === 0) {
      this.logger.warn(
        'campaigns sync returned 0 rows; skipping soft-delete sweep (empty-guard)',
      );
      return 0;
    }
    const res = await this.campaignModel.updateMany(
      {
        source: INVOLVE_CAMPAIGN_SOURCE,
        campaignBannerId: { $nin: seenIds },
        active: true,
      },
      { $set: { active: false, syncedAt: now } },
    );
    return res.modifiedCount ?? 0;
  }

  // REQ-DM-3 — resolve the parent Offer's ObjectId by name (+ country when known).
  // Returns null when no Offer matches; the row is still stored.
  private async resolveOfferId(
    parentOfferName: string | undefined,
    country: string | undefined,
  ): Promise<Types.ObjectId | null> {
    if (!parentOfferName) return null;
    const filter: Record<string, unknown> = {
      $or: [
        { offer_name: parentOfferName },
        { offer_name_display: parentOfferName },
      ],
    };
    if (country) filter.countries = new RegExp(country, 'i');
    const offer = await this.offerModel
      .findOne(filter)
      .select('_id')
      .lean<{ _id: Types.ObjectId }>()
      .exec();
    return offer?._id ?? null;
  }

  private async fetchAllPages<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ rows: T[]; pages: number }> {
    const rows: T[] = [];
    let page = 1;
    let pages = 0;
    while (pages < MAX_PAGES) {
      const envelope = await this.postWithAuth<InvolveEnvelope<T>>(path, {
        ...body,
        page,
      });
      pages += 1;
      const batch = envelope?.data?.data ?? [];
      rows.push(...batch);
      const nextPage = envelope?.data?.nextPage;
      if (!nextPage || batch.length === 0) break;
      page = nextPage;
    }
    return { rows, pages };
  }

  // POST with Bearer auth; one 401 re-auth retry + 429 backoff (REQ-SYNC-6).
  private async postWithAuth<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    let token = await this.involve.getAccessToken();
    let reauthed = false;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const res = await axios.post(`${INVOLVE_ENDPOINT}${path}`, body, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: XTRA_TIMEOUT_MS,
        });
        return res.data as T;
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response
          ?.status;
        if (status === 401 && !reauthed) {
          reauthed = true;
          token = (await this.involve.signIn()).data.token;
          continue;
        }
        if (status === 429 && attempt < RATE_LIMIT_BACKOFF_MS.length) {
          await this.sleep(RATE_LIMIT_BACKOFF_MS[attempt]);
          continue;
        }
        throw error;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // REQ-OBS-2 — structured completion summary; a zero-row run is flagged.
  private async emitSummary(summary: XtraSyncSummary): Promise<void> {
    if (summary.fetched === 0) {
      this.logger.warn(
        `involve-xtra sync ${summary.source}: 0 rows fetched over ${summary.pages} page(s)`,
      );
    } else {
      this.logger.log(
        `involve-xtra sync ${summary.source}: fetched=${summary.fetched} upserted=${summary.upserted} skipped=${summary.skipped} softDeleted=${summary.softDeleted} pages=${summary.pages}`,
      );
    }
    try {
      await this.analytics.capture(
        'involve_xtra_sync',
        { platform: 'api', anonymousId: 'system:involve-xtra' },
        {
          source: summary.source,
          pages: summary.pages,
          fetched: summary.fetched,
          upserted: summary.upserted,
          skipped: summary.skipped,
          soft_deleted: summary.softDeleted,
        },
      );
    } catch (error) {
      this.logger.warn(
        `involve-xtra sync analytics capture failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
