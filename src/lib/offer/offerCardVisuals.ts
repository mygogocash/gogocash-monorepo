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
