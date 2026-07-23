/**
 * Grid metrics for the category detail pages (/category/<name>).
 *
 * Extracted from CustomerCategoryDetailScreen so the sizing contract is unit
 * testable — same split as favoriteBrandGrid.ts.
 */
import {
  BRAND_CARD_MIN_WIDTH,
  fitBrandCardColumns,
  getBrandCardLargeHeight,
} from "@mobile/components/brandCardMetrics";
import {
  getDeviceClass,
  getScaledCompactBrandCardMetrics,
} from "@mobile/design/webDesignParity";

export function getCategoryGridMetrics({
  contentWidth,
  isDesktop,
  viewportWidth,
}: {
  contentWidth: number;
  isDesktop: boolean;
  viewportWidth: number;
}) {
  const deviceClass = getDeviceClass(viewportWidth);
  const cardSize = deviceClass === "mobile" ? "S" : "L";
  const layoutGap = isDesktop ? 32 : 0;
  const sidebarWidth = isDesktop ? 280 : 0;
  const gridWidth = Math.max(0, contentWidth - sidebarWidth - layoutGap);
  // Match the directory section setup (/brand, /shops) so every results grid
  // reads the same: 24px on desktop, 16 on tablet, 12 on phones. At the
  // 320px reflow boundary, use 8px so two compact cards retain their 140px floor.
  const mobileTwoColumnMinWidth = BRAND_CARD_MIN_WIDTH.S * 2 + 8;
  const mobileColumns = gridWidth >= mobileTwoColumnMinWidth ? 2 : 1;
  const gap =
    deviceClass === "desktop"
      ? 24
      : deviceClass === "tablet"
        ? 16
        : gridWidth >= BRAND_CARD_MIN_WIDTH.S * 2 + 12
          ? 12
          : 8;
  const preferredColumns =
    deviceClass === "desktop" ? 5 : deviceClass === "tablet" ? 4 : mobileColumns;
  // Phone category pages deliberately use the compact card in a two-up grid.
  // Tablet/desktop retain the large card used by /brand. The desktop 5-up is
  // chosen from the viewport, so it still has to be checked against the card's
  // width floor because this grid sits beside a 280px category aside.
  const { cardWidth, columns } = fitBrandCardColumns({
    contentWidth: gridWidth,
    gap,
    maxColumns: preferredColumns,
    minColumns: deviceClass === "mobile" ? mobileColumns : 2,
    size: cardSize,
  });
  const compactMetrics =
    cardSize === "S" ? getScaledCompactBrandCardMetrics(cardWidth) : null;

  return {
    cardHeight: compactMetrics?.cardHeight ?? getBrandCardLargeHeight(cardWidth),
    cardSize,
    cardWidth,
    columns,
    gap,
    gridWidth,
    layoutGap,
    logoVisualHeight: compactMetrics?.logoVisualHeight ?? 0,
    sidebarWidth,
  };
}
