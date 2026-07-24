import { createHash } from 'node:crypto';

import {
  INVOLVE_SHOP_MARKETPLACE,
  INVOLVE_SHOP_SOURCE,
  INVOLVE_SHOP_TYPES,
  type InvolveShopType,
} from './schemas/involve-shop.schema';
import { INVOLVE_CAMPAIGN_SOURCE } from './schemas/involve-campaign.schema';
import { mapCategoryKey } from './involve-xtra.category-map';

// Raw row shapes from the Involve Publisher API (subset used; see spec §6).
export interface ShopeeXtraRow {
  shop_id?: number | string;
  shop_name?: string;
  shop_type?: string;
  shop_link?: string;
  shop_image?: string;
  shop_banner?: string[] | null;
  offer_name?: string;
  country?: string;
  commission_rate?: string | number;
  period_start_time?: string;
  period_end_time?: string;
  tracking_link?: string;
}

export interface CampaignRow {
  campaign_banner_id?: number | string;
  offer_id?: number | string;
  merchant_id?: number | string;
  offer_name?: string;
  campaign_name?: string;
  description?: string;
  voucher_code?: string;
  date_campaign_start?: string;
  date_campaign_end?: string;
  banner_image_url?: string;
  tracking_link?: string;
  categories?: string;
}

// Mapped documents WITHOUT the DB-resolved `offerId` (the sync service resolves
// and attaches it), and without `syncedAt`/`active` (set by the writer).
export type MappedShop = Omit<
  {
    source: string;
    shopId: number;
    marketplace: string;
    shopName: string;
    shopType?: InvolveShopType;
    shopLink: string;
    shopImage?: string;
    shopBanner: string[];
    parentOfferName?: string;
    country: string;
    cashbackRate: number;
    commissionRateRaw?: string;
    periodStart?: Date;
    periodEnd?: Date;
    trackingLink: string;
    categoryKey: string | null;
    sourceHash: string;
  },
  never
>;

export interface MappedCampaign {
  source: string;
  campaignBannerId: number;
  offerIdNumeric?: number;
  merchantId?: number;
  offerName?: string;
  campaignName?: string;
  description?: string;
  voucherCode?: string;
  dateStart?: Date;
  dateEnd?: Date;
  bannerImageUrl?: string;
  trackingLink: string;
  categoryKey: string | null;
  withBanner: boolean;
  sourceHash: string;
}

/**
 * REQ-DM-2 — parse `commission_rate` ("0.0150" → 0.015). Returns null for
 * empty/malformed input so the caller rejects the row instead of storing NaN.
 */
export function parseCashbackRate(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null) return null;
  const n =
    typeof raw === 'number' ? raw : Number.parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function toNumber(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function toDate(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function normalizeShopType(v: string | undefined): InvolveShopType | undefined {
  if (!v) return undefined;
  const lowered = v.trim().toLowerCase();
  return (INVOLVE_SHOP_TYPES as readonly string[]).includes(lowered)
    ? (lowered as InvolveShopType)
    : undefined;
}

function stableHash(payload: Record<string, unknown>): string {
  // Stable stringify: sort keys so re-ordered upstream fields don't churn the hash.
  const ordered = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = payload[k];
      return acc;
    }, {});
  return createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
}

/**
 * Map a `/shopeextra/all` row to an `involve_shops` document. Returns null when
 * a row is unusable (missing shopId / tracking_link / shop_name, or a malformed
 * commission_rate) — the caller logs + skips it (never stores a NaN rate).
 */
export function mapShopeeXtraRow(row: ShopeeXtraRow): MappedShop | null {
  const shopId = toNumber(row.shop_id);
  const shopName = row.shop_name?.trim();
  const shopLink = row.shop_link?.trim();
  const trackingLink = row.tracking_link?.trim();
  const country = row.country?.trim();
  const cashbackRate = parseCashbackRate(row.commission_rate);
  if (
    shopId == null ||
    !shopName ||
    !shopLink ||
    !trackingLink ||
    !country ||
    cashbackRate == null
  ) {
    return null;
  }
  const mapped = {
    source: INVOLVE_SHOP_SOURCE,
    shopId,
    marketplace: INVOLVE_SHOP_MARKETPLACE,
    shopName,
    shopType: normalizeShopType(row.shop_type),
    shopLink,
    shopImage: row.shop_image?.trim() || undefined,
    shopBanner: Array.isArray(row.shop_banner) ? row.shop_banner : [],
    parentOfferName: row.offer_name?.trim() || undefined,
    country,
    cashbackRate,
    commissionRateRaw:
      row.commission_rate != null ? String(row.commission_rate) : undefined,
    periodStart: toDate(row.period_start_time),
    periodEnd: toDate(row.period_end_time),
    trackingLink,
    // Shops carry no category (REQ-DM-4) → null; badge falls back to shopType.
    categoryKey: null as string | null,
    sourceHash: '',
  };
  mapped.sourceHash = stableHash({
    shopName: mapped.shopName,
    shopType: mapped.shopType,
    shopLink: mapped.shopLink,
    shopImage: mapped.shopImage,
    shopBanner: mapped.shopBanner,
    cashbackRate: mapped.cashbackRate,
    trackingLink: mapped.trackingLink,
    periodEnd: mapped.periodEnd?.toISOString(),
  });
  return mapped;
}

/** Map a `/campaigns/all` row to an `involve_campaigns` document (null if unusable). */
export function mapCampaignRow(row: CampaignRow): MappedCampaign | null {
  const campaignBannerId = toNumber(row.campaign_banner_id);
  const trackingLink = row.tracking_link?.trim();
  if (campaignBannerId == null || !trackingLink) return null;
  const mapped: MappedCampaign = {
    source: INVOLVE_CAMPAIGN_SOURCE,
    campaignBannerId,
    offerIdNumeric: toNumber(row.offer_id),
    merchantId: toNumber(row.merchant_id),
    offerName: row.offer_name?.trim() || undefined,
    campaignName: row.campaign_name?.trim() || undefined,
    description: row.description?.trim() || undefined,
    voucherCode: row.voucher_code?.trim() || undefined,
    dateStart: toDate(row.date_campaign_start),
    dateEnd: toDate(row.date_campaign_end),
    bannerImageUrl: row.banner_image_url?.trim() || undefined,
    trackingLink,
    categoryKey: mapCategoryKey(row.categories),
    withBanner: Boolean(row.banner_image_url?.trim()),
    sourceHash: '',
  };
  mapped.sourceHash = stableHash({
    voucherCode: mapped.voucherCode,
    bannerImageUrl: mapped.bannerImageUrl,
    trackingLink: mapped.trackingLink,
    dateEnd: mapped.dateEnd?.toISOString(),
    campaignName: mapped.campaignName,
  });
  return mapped;
}

/**
 * REQ-DM-6 — a row is servable only when active AND now ≤ periodEnd/dateEnd.
 * A missing end date is treated as open-ended (servable while active).
 */
export function isServable(
  active: boolean,
  endDate: Date | null | undefined,
  now: Date,
): boolean {
  if (!active) return false;
  if (!endDate) return true;
  return now.getTime() <= endDate.getTime();
}
