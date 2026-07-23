/**
 * Grid metrics for the category detail pages (/category/<name>).
 *
 * Extracted from CustomerCategoryDetailScreen so the sizing contract is unit
 * testable — same split as favoriteBrandGrid.ts.
 */
import { fitBrandCardColumns } from "@mobile/components/brandCardMetrics";
import { getScaledCompactBrandCardMetrics } from "@mobile/design/webDesignParity";

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
  // The desktop 5-up is chosen from the viewport, but this grid sits beside a
  // 280px category aside — so the card has to be checked against its own floor
  // or it scales down into an illegible third design.
  const { cardWidth, columns } = fitBrandCardColumns({
    contentWidth: gridWidth,
    gap,
    maxColumns: preferredColumns,
    size: "S",
  });
  const scaledCard = getScaledCompactBrandCardMetrics(cardWidth);

  return {
    cardHeight: scaledCard.cardHeight,
    cardWidth,
    logoVisualHeight: scaledCard.logoVisualHeight,
    columns,
    gap,
    gridWidth,
    layoutGap,
    sidebarWidth,
  };
}
