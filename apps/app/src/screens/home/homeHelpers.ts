import { type ImageSourcePropType, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import { type HomeHeroBanner } from "@mobile/account/homeBannerResource";
import { resolveHeroBannerRemoteImageSource } from "@mobile/lib/heroBannerImage";
import { getCarouselActiveIndex, getTopBrandHref } from "@mobile/design/webDesignParity";

import { heroBannerAssets } from "./homeAssets";
import { type CompactBrandLogoOfferCardProps, type HomeLayoutMetrics, type TopBrandCardProps } from "./homeTypes";

export function resolveHeroBannerImageSource(
  banner: HomeHeroBanner,
): ImageSourcePropType | undefined {
  if (banner.imageUri) {
    return resolveHeroBannerRemoteImageSource(banner.imageUri);
  }

  return banner.asset ? heroBannerAssets[banner.asset] : undefined;
}

/** @deprecated Import `resolveHeroBannerImageSource` instead. */
export const heroBannerSource = resolveHeroBannerImageSource;

export function brandHref(brand: string) {
  return getTopBrandHref(brand);
}

export function chunkTopBrandCards(cards: readonly TopBrandCardProps[], pageSize: number) {
  const topBrandPages: TopBrandCardProps[][] = [];

  for (let index = 0; index < cards.length; index += pageSize) {
    topBrandPages.push(cards.slice(index, index + pageSize));
  }

  return topBrandPages;
}

export function chunkCompactBrandCards(
  cards: readonly CompactBrandLogoOfferCardProps[],
  pageSize: number
) {
  const promoPages: CompactBrandLogoOfferCardProps[][] = [];

  for (let index = 0; index < cards.length; index += pageSize) {
    promoPages.push(cards.slice(index, index + pageSize));
  }

  return promoPages;
}

const ONE_ROW_PROMO_SECTION_IDS = new Set(["travel", "makeup"]);
const ONE_ROW_PROMO_MAX_CARDS = 16;

export function getPromoSectionCards(
  sectionId: string,
  cards: readonly CompactBrandLogoOfferCardProps[]
) {
  return ONE_ROW_PROMO_SECTION_IDS.has(sectionId)
    ? cards.slice(0, ONE_ROW_PROMO_MAX_CARDS)
    : cards;
}

export function getPromoSectionPageSize(homeLayout: HomeLayoutMetrics) {
  // Every promo rail is a fixed 8-column x 2-row group (compactBrandCardsPerPage), matching
  // Top Brands; the group slides as one unit and overflows narrow screens with a peek card.
  return homeLayout.compactBrandCardsPerPage;
}

export function getPagedScrollIndex(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  pageWidth: number,
  maxPageIndex: number
) {
  return getCarouselActiveIndex({
    contentOffsetX: event.nativeEvent.contentOffset.x,
    pageCount: maxPageIndex + 1,
    pageWidth,
  });
}
