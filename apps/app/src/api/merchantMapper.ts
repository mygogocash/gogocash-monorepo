import type { MerchantOfferResponse } from "@mobile/api/merchantTypes";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import {
  BRAND_LOGO_IMAGE_WIDTH,
  SHOP_BANNER_IMAGE_WIDTH,
} from "@mobile/api/optimizedImageUrl";
import { getMobileEnv } from "@mobile/config/env";
import {
  formatMerchantCashback,
  formatPercentValue,
  type ProductTypeCashbackRow,
} from "@mobile/api/offerCashbackFormat";
import {
  resolvePublicOfferLogo,
  resolveShopPageBannerUri,
} from "@mobile/api/offerLogo";
import { resolveOfferDisplayCategory } from "@mobile/api/offerDisplayCategory";
import { isUpsizeActiveNow } from "@mobile/api/upsizeStatus";

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

/** #465 — map non-tagline product_type rows into the shop detail rate list. */
export function mapProductTypeRates(
  productType: readonly ProductTypeCashbackRow[] | null | undefined,
  fallback: ProductRate,
): ProductRate[] {
  if (!Array.isArray(productType) || productType.length === 0) {
    return [fallback];
  }
  const rows: ProductRate[] = [];
  for (const row of productType) {
    if (!row || typeof row !== "object") continue;
    if (row.is_tagline === true) continue;
    if (row.pay_in === "cash") continue;
    const name =
      typeof (row as { name?: unknown }).name === "string"
        ? String((row as { name?: string }).name).trim()
        : "";
    const rate = formatPercentValue(row.commission_info);
    if (!name || !rate) continue;
    rows.push({ name, rate });
  }
  return rows.length > 0 ? rows : [fallback];
}

/**
 * #471 — when an upsize window is live, prefer upsize rates for shop detail
 * headline + product list; otherwise use the base offer cashback fields.
 */
export function resolveActiveShopCashback(
  offer: MerchantOfferResponse,
  nowMs: number = Date.now(),
): {
  commission_store?: unknown;
  product_type?: readonly ProductTypeCashbackRow[] | null;
  commissions?: MerchantOfferResponse["commissions"];
} {
  if (!isUpsizeActiveNow(offer, nowMs)) {
    return {
      commission_store: offer.commission_store,
      product_type: offer.product_type as ProductTypeCashbackRow[] | undefined,
      commissions: offer.commissions,
    };
  }

  const upsizeAll = offer.upsize_all_product_types !== false;
  if (upsizeAll && offer.upsize_special_commission != null) {
    return {
      commission_store: offer.upsize_special_commission,
      product_type: undefined,
      commissions: undefined,
    };
  }

  const upsizeRows = offer.upsize_product_types as
    | ProductTypeCashbackRow[]
    | undefined;
  if (Array.isArray(upsizeRows) && upsizeRows.length > 0) {
    return {
      commission_store: undefined,
      product_type: upsizeRows,
      commissions: undefined,
    };
  }

  // Configured but empty lines / missing commission — fall back to base rates.
  return {
    commission_store: offer.commission_store,
    product_type: offer.product_type as ProductTypeCashbackRow[] | undefined,
    commissions: offer.commissions,
  };
}

type LiveShopDetailFields = {
  bannerUri?: string;
  customTerms?: string;
  disclaimer: string;
  extraCashback: string;
  logoText: string;
  logoUri?: string;
  /** Affiliate-network ids for minting per-user tracked links on Shop Now. */
  merchantId?: number;
  offerId?: number;
  note: string;
  noteToUser?: string;
  policyCategoryId?: string;
  productRates: ProductRate[];
  /** #472 — admin Extra Cashback tag toggle (`offer_display_tags.extra_cashback_tag`). */
  showExtraCashbackTag: boolean;
  trackingPeriod: readonly TrackingPeriodStep[];
};

export type TrackingPeriodStep = {
  label: string;
  detail: string;
  /** Optional third line under the day count (e.g. "from the following month"). */
  subtitle?: string;
  icon: "shopping" | "check" | "bank";
};

function isValidTrackingDays(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 365
  );
}

/** Non-empty trimmed subtitle or undefined (no third line). */
function stepSubtitle(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * API-derived tracking windows → the shop page's step strip, in the exact
 * fixture format (`within N day` is the web-parity copy). Returns null when
 * either window is missing/invalid so the fixture steps pass through — older
 * API payloads without tracking_period keep today's behavior.
 *
 * flow_type 'two_step' collapses Tracking+Confirm into a combined
 * "Tracking and confirm" step; anything else (incl. missing on older APIs)
 * renders the classic 3 steps. Subtitles ride through as-typed — the default
 * captions have Thai catalog entries, admin-custom text renders verbatim.
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
  const purchase: TrackingPeriodStep = {
    label: "Purchase",
    detail: "with GoGoCash",
    icon: "shopping",
  };
  if (period.flow_type === "two_step") {
    return [
      purchase,
      {
        label: "Tracking and confirm",
        detail: `within ${period.confirm_days} day`,
        subtitle: stepSubtitle(period.confirm_subtitle) ?? "after validation",
        icon: "bank",
      },
    ];
  }
  return [
    purchase,
    {
      label: "Tracking",
      detail: `within ${period.tracking_days} day`,
      subtitle: stepSubtitle(period.tracking_subtitle),
      icon: "check",
    },
    {
      label: "Confirm",
      detail: `within ${period.confirm_days} day`,
      subtitle: stepSubtitle(period.confirm_subtitle),
      icon: "bank",
    },
  ];
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
  // #471 — active upsize overrides base commission / product_type for display.
  const cashbackSource = resolveActiveShopCashback(offer);
  const cashback = formatMerchantCashback(cashbackSource) ?? "—";
  const apiBaseUrl = getMobileEnv().apiUrl;
  // #465 — when admin marks "All product types", show one headline row only.
  // Per-line lists still render for `all_product_types === false` (and legacy
  // payloads that omit the flag) or for active per-line upsize (#471).
  const upsizeActive = isUpsizeActiveNow(offer);
  const preferProductTypeList = upsizeActive
    ? offer.upsize_all_product_types === false
    : offer.all_product_types !== true;
  const productRates = preferProductTypeList
    ? mapProductTypeRates(cashbackSource.product_type, {
        name: brand,
        rate: cashback,
      })
    : [{ name: brand, rate: cashback }];

  return {
    ...fixtureShop,
    bannerUri: firstImageUri(apiBaseUrl, SHOP_BANNER_IMAGE_WIDTH, resolveShopPageBannerUri(offer)),
    brand,
    cashback,
    category: resolveOfferDisplayCategory(offer, fixtureShop.category),
    customTerms: offer.custom_terms?.trim() || undefined,
    // Brand-less constants (not `${brand} …` templates) so tc() can reverse-look-up
    // the exact English catalog value and render Thai in Thai mode.
    disclaimer:
      "Cashback rates, tracking windows, exclusions, and availability can change. " +
      "Final approval remains subject to the merchant and partner network.",
    extraCashback: cashback,
    id: offer._id,
    logoText: initialsFromBrand(brand),
    logoUri: firstImageUri(apiBaseUrl, BRAND_LOGO_IMAGE_WIDTH, resolvePublicOfferLogo(offer)),
    merchantId: typeof offer.merchant_id === "number" ? offer.merchant_id : undefined,
    offerId: typeof offer.offer_id === "number" ? offer.offer_id : undefined,
    note:
      offer.note_to_user?.trim() ||
      "Cashback is tracked through GoGoCash after you open the merchant link and complete an eligible order.",
    noteToUser: offer.note_to_user?.trim() || undefined,
    policyCategoryId:
      offer.policy_category_id?.trim() === "custom"
        ? undefined
        : offer.policy_category_id?.trim() || undefined,
    productRates,
    showExtraCashbackTag: offer.offer_display_tags?.extra_cashback_tag === true,
    // Admin/partner-configured windows when the API sends them; otherwise the
    // fixture's default 30/30 steps.
    trackingPeriod:
      buildTrackingPeriodSteps(offer.tracking_period) ?? fixtureShop.trackingPeriod,
    trackingUrl: offer.tracking_link?.trim() || undefined,
  };
}
