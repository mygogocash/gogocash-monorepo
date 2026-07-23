/**
 * Row height for the shared `BrandCard` at size "L".
 *
 * Lives beside BrandCard because it mirrors that component's vertical box model —
 * if `brandCard` / `lShopCardTitle` / `brandCashbackRow` change in
 * BrandCard.tsx, this must change with them.
 *
 * The virtualized directory grids need a fixed row height up front, so the
 * measurement cannot come from layout.
 */
import { spacing } from "@mobile/theme/tokens";

/**
 * Narrowest each brand card may render before its cashback row clips. Measured
 * with canvas `measureText` in the shipped font (DM Sans):
 *
 *   L: "Cashback upto" @11px (77) + row gap (10) + widest value "2.45%" @18px
 *      bold (54) + chrome (18) = 159   → canonical directory card 158.4
 *   S: "Cashback upto" @10px (70) + row gap (4)  + widest value "2.45%" @16px
 *      bold (48) + chrome (18) = 140   → canonical compact card 144
 *
 * A grid may scale a card between these and its natural size, but must drop a
 * column rather than go under. Ignoring this is what turned the category pages
 * into a third, illegible design ("Cash…", "C…").
 */
export const BRAND_CARD_MIN_WIDTH = { L: 158, S: 140 } as const;

export type BrandCardSize = keyof typeof BRAND_CARD_MIN_WIDTH;

/**
 * Pick the densest column count whose resulting card still clears its size's
 * floor. `maxColumns` stays the design's preferred density for the viewport;
 * this only ever reduces it.
 *
 * Two columns is the floor — one full-bleed card per row reads as a broken grid.
 */
export function fitBrandCardColumns({
  contentWidth,
  gap,
  maxColumns,
  minColumns = 2,
  size,
}: {
  contentWidth: number;
  gap: number;
  maxColumns: number;
  minColumns?: number;
  size: BrandCardSize;
}): { cardWidth: number; columns: number } {
  const widthAt = (count: number) =>
    (contentWidth - gap * Math.max(0, count - 1)) / count;

  let columns = Math.max(minColumns, maxColumns);
  while (columns > minColumns && widthAt(columns) < BRAND_CARD_MIN_WIDTH[size]) {
    columns -= 1;
  }

  return { cardWidth: widthAt(columns), columns };
}

/** `brandCard.padding` in BrandCard.tsx. */
const CARD_PADDING = 8;
/** `brandCard.borderWidth` in BrandCard.tsx. */
const CARD_BORDER = 1;
/** `lShopCardTitle.lineHeight` — the name is `numberOfLines={1}`. */
const TITLE_LINE_HEIGHT = 20;
/**
 * `brandCashbackRow` is a baseline row whose tallest child is `brandCashback`
 * (lineHeight 18); baseline alignment renders it ~18.5. Reserved at 20 so a
 * font-metric wobble cannot clip the cashback figure.
 */
const CASHBACK_ROW_HEIGHT = 20;

export function getBrandCardLargeHeight(cardWidth: number): number {
  const chrome = (CARD_PADDING + CARD_BORDER) * 2;
  // `brandVisual` is aspectRatio 1 at width 100%, so it is square on the inner width.
  const logoTileHeight = cardWidth - chrome;

  return (
    chrome +
    logoTileHeight +
    // `lShopCardTitle.marginTop` + `brandCashbackRow.marginTop`
    spacing.xs +
    TITLE_LINE_HEIGHT +
    spacing.xs +
    CASHBACK_ROW_HEIGHT
  );
}
