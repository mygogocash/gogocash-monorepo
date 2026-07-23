/**
 * Grid metrics for the category detail pages (/category/<name>).
 *
 * Extracted from CustomerCategoryDetailScreen so the sizing contract is unit
 * testable — same split as favoriteBrandGrid.ts.
 */
import {
  fitBrandCardColumns,
  getBrandCardLargeHeight,
} from "@mobile/components/brandCardMetrics";

export function getCategoryGridMetrics({
  contentWidth,
  isDesktop,
  viewportWidth,
}: {
  contentWidth: number;
  isDesktop: boolean;
  viewportWidth: number;
}) {
  const layoutGap = isDesktop ? 32 : 0;
  const sidebarWidth = isDesktop ? 280 : 0;
  const gridWidth = Math.max(0, contentWidth - sidebarWidth - layoutGap);
  // Match the directory section setup (/brand, /shops) so every results grid
  // reads the same: 24px on desktop, 16 on tablet, 12 on phones.
  const gap = isDesktop ? 24 : viewportWidth >= 640 ? 16 : 12;
  const preferredColumns = isDesktop
    ? 5
    : viewportWidth >= 768
      ? 4
      : viewportWidth >= 640
        ? 3
        : 2;
  // Same setup as the All Brands page: the big card. This grid used to render a
  // scaled size "S", which at desktop widths stretched to 185.3 wide — wider
  // than the big card on /brand (180). The desktop 5-up is chosen from the
  // viewport, so it still has to be checked against the card's width floor
  // because this grid sits beside a 280px category aside.
  const { cardWidth, columns } = fitBrandCardColumns({
    contentWidth: gridWidth,
    gap,
    maxColumns: preferredColumns,
    size: "L",
  });

  return {
    cardHeight: getBrandCardLargeHeight(cardWidth),
    cardWidth,
    columns,
    gap,
    gridWidth,
    layoutGap,
    sidebarWidth,
  };
}
