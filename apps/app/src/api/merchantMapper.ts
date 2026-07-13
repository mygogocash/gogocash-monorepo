import type { MerchantOfferResponse } from "@mobile/api/merchantTypes";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import {
  BRAND_LOGO_IMAGE_WIDTH,
  SHOP_BANNER_IMAGE_WIDTH,
} from "@mobile/api/optimizedImageUrl";
import { getMobileEnv } from "@mobile/config/env";
import {
  resolvePublicOfferLogo,
  resolveShopPageBannerUri,
} from "@mobile/api/offerLogo";

type ShopDetailIdentity = {
  brand: string;
  cashback: string;
  category: string;
  customTerms?: string;
  id: string;
  policyCategoryId?: string;
  trackingUrl?: string;
};

type ProductRate = {
  name: string;
  rate: string;
};

type LiveShopDetailFields = {
  bannerUri?: string;
  customTerms?: string;
  disclaimer: string;
  extraCashback: string;
  logoText: string;
  logoUri?: string;
  note: string;
  noteToUser?: string;
  policyCategoryId?: string;
  productRates: ProductRate[];
  trackingPeriod: readonly TrackingPeriodStep[];
};

export type TrackingPeriodStep = {
  label: string;
  detail: string;
  icon: "shopping" | "check" | "bank";
};

function isValidTrackingDays(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365
  );
}

/**
 * API-derived tracking windows → the shop page's 3-step strip, in the exact
 * fixture format (`within N day` is the web-parity copy). Returns null when
 * either window is missing/invalid so the fixture steps pass through — older
 * API payloads without tracking_period keep today's behavior.
 */
export function buildTrackingPeriodSteps(
  period: MerchantOfferResponse["tracking_period"],
): TrackingPeriodStep[] | null {
  if (
    !period ||
    !isValidTrackingDays(period.tracking_days) ||
    !isValidTrackingDays(period.confirm_days)
  ) {
    return null;
  }
  return [
    { label: "Purchase", detail: "with GoGoCash", icon: "shopping" },
    { label: "Tracking", detail: `within ${period.tracking_days} day`, icon: "check" },
    { label: "Confirm", detail: `within ${period.confirm_days} day`, icon: "bank" },
  ];
}

function formatCashback(offer: MerchantOfferResponse): string | null {
  const store = offer.commission_store;
  if (typeof store === "number" && Number.isFinite(store)) {
    return `${store}%`;
  }
  if (typeof store === "string" && store.trim()) {
    return store.includes("%") ? store.trim() : `${store.trim()}%`;
  }
  const commission = offer.commissions?.[0]?.Commission?.trim();
  if (commission) {
    return commission.includes("%") ? commission : `${commission}%`;
  }
  return null;
}

function initialsFromBrand(brand: string): string {
  const parts = brand
    .replace(/&/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "GO";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function firstImageUri(
  apiBaseUrl: string,
  width: number,
  ...values: unknown[]
): string | undefined {
  for (const value of values) {
    const uri = resolveOfferMediaUrl(value, apiBaseUrl, { width });
    if (uri) {
      return uri;
    }
  }
  return undefined;
}

export function mapMerchantOfferToShopDetail<
  TShop extends ShopDetailIdentity & { trackingPeriod: readonly TrackingPeriodStep[] },
>(
  offer: MerchantOfferResponse,
  fixtureShop: TShop
): Omit<TShop, keyof ShopDetailIdentity | "trackingPeriod"> &
  ShopDetailIdentity &
  LiveShopDetailFields {
  const brand =
    offer.offer_name_display?.trim() || offer.offer_name?.trim() || fixtureShop.brand;
  // Never fall back to fixture cashback on a live offer — that leaks Grocery Galaxy
  // rates (e.g. 26.5%) onto merchants whose commission fields are empty.
  const cashback = formatCashback(offer) ?? "—";
  const apiBaseUrl = getMobileEnv().apiUrl;

  return {
    ...fixtureShop,
    bannerUri: firstImageUri(apiBaseUrl, SHOP_BANNER_IMAGE_WIDTH, resolveShopPageBannerUri(offer)),
    brand,
    cashback,
    category: offer.categories?.trim() || fixtureShop.category,
    customTerms: offer.custom_terms?.trim() || undefined,
    disclaimer:
      `${brand} cashback rates, tracking windows, exclusions, and availability can change. ` +
      "Final approval remains subject to the merchant and partner network.",
    extraCashback: cashback,
    id: offer._id,
    logoText: initialsFromBrand(brand),
    logoUri: firstImageUri(apiBaseUrl, BRAND_LOGO_IMAGE_WIDTH, resolvePublicOfferLogo(offer)),
    note:
      offer.note_to_user?.trim() ||
      `${brand} cashback is tracked through GoGoCash after you open the merchant link and complete an eligible order.`,
    noteToUser: offer.note_to_user?.trim() || undefined,
    policyCategoryId: offer.policy_category_id?.trim() || undefined,
    productRates: [{ name: brand, rate: cashback }],
    // Admin/partner-configured windows when the API sends them; otherwise the
    // fixture's default 30/30 steps.
    trackingPeriod:
      buildTrackingPeriodSteps(offer.tracking_period) ?? fixtureShop.trackingPeriod,
    trackingUrl: offer.tracking_link?.trim() || fixtureShop.trackingUrl,
  };
}
