import { DataOffer } from "@/interfaces/offer";
import { banner, getPercent } from "@/lib/utils";
import {
  normalizeCategoryKey,
  SHOP_EXPLORE_MENU_ITEMS,
} from "@/features/shop/shopExploreCategoryMenu";

export const FALLBACK_BANNER = "/home/banner.webp";

/** Resolved banner URL for CardSpecial / CardShopMini (matches `CardSlideCategory` rules). */
export function getOfferBannerSrc(offer: DataOffer, isDesktopWidth: boolean): string {
  if (offer.banner || offer.banner_mobile) {
    return banner(offer.banner_mobile, offer.banner, isDesktopWidth);
  }
  return FALLBACK_BANNER;
}

/** Cashback label for cards, e.g. `12.5%` (empty when unknown). */
export function getOfferCashbackPercentLabel(offer: DataOffer): string {
  if (offer.commission_store) {
    return `${offer.commission_store.toFixed(1)}%`;
  }
  if (offer.commissions) {
    return `${getPercent(offer.commissions)}%`;
  }
  return "";
}

function discoverListingAmountThb(offer: DataOffer): number {
  if (typeof offer.listing_price_thb === "number" && Number.isFinite(offer.listing_price_thb)) {
    return Math.max(0, Math.round(offer.listing_price_thb));
  }
  let h = 0;
  const s = offer._id || String(offer.offer_id ?? "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  /** Stable placeholder range when API does not send `listing_price_thb`. */
  return 100 + (h % 1900);
}

/** Discover tile: formatted listing price in THB (e.g. `100 THB`). */
export function getDiscoverListingPriceLabel(offer: DataOffer, locale: string): string {
  const amount = discoverListingAmountThb(offer);
  const isTh = locale.toLowerCase().startsWith("th");
  const fmt = new Intl.NumberFormat(isTh ? "th-TH" : "en-US", { maximumFractionDigits: 0 });
  return `${fmt.format(amount)} THB`;
}

/**
 * Outbound URL for Discover “Shop Now” — product-level affiliate link when provided.
 * Order: `listing_affiliate_url` → `tracking_link` → `preview_url`.
 */
export function getDiscoverProductOutboundUrl(offer: DataOffer): string {
  const a = offer.listing_affiliate_url?.trim();
  if (a) return a;
  const t = offer.tracking_link?.trim();
  if (t) return t;
  return offer.preview_url?.trim() ?? "";
}

/**
 * Maps feed `condition` (e.g. Studio7 CPS `new`) to localized Discover card copy.
 * Unknown tokens are title-cased for display.
 */
export function formatOfferListingCondition(
  raw: string | undefined,
  translate: (key: string) => string
): string {
  if (!raw?.trim()) return "";
  const k = raw
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (k === "new") return translate("productConditionNew");
  if (k === "refurbished" || k === "renewed") return translate("productConditionRefurbished");
  if (k === "used" || k === "pre_owned" || k === "preowned")
    return translate("productConditionUsed");
  const words = raw.trim().split(/[\s_-]+/);
  return words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(" ");
}

const OTHERS_INDEX = SHOP_EXPLORE_MENU_ITEMS.length - 1;

/**
 * Maps API `categories` (often a single name or comma-separated) to the fixed shop menu label
 * and Figma Menu Taps icon index for `ShopExploreMenuTapIcon`.
 */
export function getOfferCategoryRowVisual(categories: string): {
  label: string;
  iconIndex: number;
} {
  const raw = categories.split(",")[0]?.trim() ?? "";
  const norm = normalizeCategoryKey(raw);

  if (!norm) {
    const others = SHOP_EXPLORE_MENU_ITEMS[OTHERS_INDEX];
    return {
      label: others?.label ?? "Others",
      iconIndex: OTHERS_INDEX,
    };
  }

  for (let i = 0; i < SHOP_EXPLORE_MENU_ITEMS.length; i++) {
    const item = SHOP_EXPLORE_MENU_ITEMS[i];
    if (!item) continue;
    for (const mk of item.matchKeys) {
      if (norm === normalizeCategoryKey(mk)) {
        return { label: item.label, iconIndex: i };
      }
    }
  }

  for (let i = 0; i < SHOP_EXPLORE_MENU_ITEMS.length; i++) {
    const item = SHOP_EXPLORE_MENU_ITEMS[i];
    if (!item) continue;
    for (const mk of item.matchKeys) {
      const nk = normalizeCategoryKey(mk);
      if (nk.length >= 3 && (norm.includes(nk) || nk.includes(norm))) {
        return { label: item.label, iconIndex: i };
      }
    }
  }

  return { label: raw, iconIndex: OTHERS_INDEX };
}
