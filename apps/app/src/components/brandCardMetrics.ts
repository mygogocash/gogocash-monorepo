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
