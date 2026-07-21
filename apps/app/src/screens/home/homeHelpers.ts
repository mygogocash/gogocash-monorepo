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

export type HomeCarouselLayoutMode = "pager" | "scroll" | "grid";

// Founder feedback 2026-07-11: mobile rails snapped by a whole 8-column group
// (~4 screens wide) and a 4-card section hid half its cards behind a swipe.
// Mobile sections whose cards all fit render a static 2-column grid; longer
// rails free-scroll with natural momentum. Desktop keeps the web-parity pager.
const PROMO_GRID_MAX_CARDS = 4;

export function getPromoSectionLayoutMode(
  isDesktop: boolean,
  cardCount: number,
): HomeCarouselLayoutMode {
  if (isDesktop) {
    return "pager";
  }
  return cardCount <= PROMO_GRID_MAX_CARDS ? "grid" : "scroll";
}

/** Fit-all grid: two columns filling the section frame exactly. */
export function getPromoGridCardWidth(frameWidth: number, gap: number): number {
  return Math.floor((frameWidth - gap) / 2);
}

/**
 * #499 — row count is a SECTION property, not a viewport one. topBrandRowsPerPage is a
 * global metric that TopBrandSection also reads, so specialising it there would resize Top
 * Brands too. Travel and Makeup are one-row rails; everything else keeps the shared rhythm.
 */
export function getPromoSectionRowsPerPage(
  sectionId: string,
  homeLayout: HomeLayoutMetrics,
): number {
  return ONE_ROW_PROMO_SECTION_IDS.has(sectionId)
    ? 1
    : homeLayout.topBrandRowsPerPage;
}

/**
 * Height for a section's rail. A one-row section is exactly one card tall with no gap
 * term — reserving the second row plus its gap is the empty space #499 reports.
 */
export function getPromoSectionGridHeight(
  sectionId: string,
  homeLayout: HomeLayoutMetrics,
): number {
  const rows = getPromoSectionRowsPerPage(sectionId, homeLayout);
  return rows * homeLayout.topBrandCardHeight + (rows - 1) * homeLayout.topBrandGap;
}

export function getPromoSectionPageSize(
  sectionId: string,
  homeLayout: HomeLayoutMetrics,
) {
  // Issue #253: promo rails match Top Brands page size (topBrandCardsPerPage).
  // #499: a one-row section pages by a single row of columns instead.
  return (
    homeLayout.topBrandColumns * getPromoSectionRowsPerPage(sectionId, homeLayout)
  );
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

export {
  buildLoopedHeroBannerSlides,
  getLoopedHeroBannerActiveIndex,
  getLoopedHeroBannerAutoAdvanceTarget,
  getLoopedHeroBannerDotScrollX,
  nextBannerIndex,
  normalizeBannerIndex,
  prevBannerIndex,
  resolveLoopedHeroBannerJumpTarget,
} from "./homeHeroBannerCarousel";
