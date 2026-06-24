const FAVORITE_BRAND_GRID_GAP_MOBILE = 14;
const FAVORITE_BRAND_GRID_GAP_DESKTOP = 18;
const FAVORITE_BRAND_MIN_CARD_WIDTH = 172;
const FAVORITE_BRAND_MAX_CARD_WIDTH = 280;
const FAVORITE_BRAND_VISUAL_ASPECT = 153 / 272;
const FAVORITE_BRAND_META_HEIGHT = 111;

export function getFavoriteBrandGridMetrics(contentWidth: number, isDesktop: boolean) {
  const gap = isDesktop ? FAVORITE_BRAND_GRID_GAP_DESKTOP : FAVORITE_BRAND_GRID_GAP_MOBILE;
  let columns = isDesktop
    ? Math.max(2, Math.floor((contentWidth + gap) / (FAVORITE_BRAND_MIN_CARD_WIDTH + gap)))
    : 2;
  let cardWidth = (contentWidth - gap * (columns - 1)) / columns;

  if (isDesktop && cardWidth > FAVORITE_BRAND_MAX_CARD_WIDTH) {
    columns = Math.max(
      2,
      Math.floor((contentWidth + gap) / (FAVORITE_BRAND_MAX_CARD_WIDTH + gap))
    );
    cardWidth = (contentWidth - gap * (columns - 1)) / columns;
  }

  return { cardWidth, columns, gap };
}

export function getFavoriteBrandCardHeight(cardWidth: number) {
  const innerWidth = Math.max(0, cardWidth - 16);
  return innerWidth * FAVORITE_BRAND_VISUAL_ASPECT + FAVORITE_BRAND_META_HEIGHT;
}
