import { DataOffer } from "@/interfaces/offer";
import { banner, getPercent } from "@/lib/utils";

const FALLBACK_BANNER = "/home/banner.webp";

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
