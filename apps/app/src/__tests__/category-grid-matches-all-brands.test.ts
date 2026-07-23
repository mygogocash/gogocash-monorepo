import { describe, expect, it } from "vitest";

import { BRAND_CARD_MIN_WIDTH, getBrandCardLargeHeight } from "@mobile/components/brandCardMetrics";
import { getShopDirectoryGridMetrics } from "@mobile/design/webDesignParity";
import { getCategoryGridMetrics } from "@mobile/screens/categoryDetailGrid";

/**
 * Founder call: the category pages (/category/*) use the same setup as the
 * All Brands page (/brand) — same big card, same gap, same column density.
 *
 * They previously rendered a scaled BrandCard size "S", which at desktop widths
 * stretched to 185.3px wide × 210 tall — WIDER than the big card it sits beside
 * on /brand (180 × 232). A "small" card that outgrows the big one is the third
 * design this suite exists to prevent.
 */
const CASES = [
  { contentWidth: 900, label: "1100px desktop", viewportWidth: 1100 },
  { contentWidth: 1240, label: "1440px desktop", viewportWidth: 1440 },
];

describe("category grid matches All Brands", () => {
  for (const { contentWidth, label, viewportWidth } of CASES) {
    it(`category detail > given ${label} > uses the same gap and columns as /brand`, () => {
      const category = getCategoryGridMetrics({
        contentWidth,
        isDesktop: true,
        viewportWidth,
      });
      // /brand sizes from the same aside-narrowed grid width.
      const allBrands = getShopDirectoryGridMetrics({
        contentWidth: category.gridWidth,
        viewportWidth,
      });

      expect(category.gap).toBe(allBrands.gap);
      expect(category.columns).toBe(allBrands.columns);
      expect(category.cardWidth).toBeCloseTo(allBrands.cardWidth, 0);
    });

    it(`category detail > given ${label} > reserves the big card's height`, () => {
      const category = getCategoryGridMetrics({
        contentWidth,
        isDesktop: true,
        viewportWidth,
      });

      expect(category.cardHeight).toBe(getBrandCardLargeHeight(category.cardWidth));
    });

    it(`category detail > given ${label} > clears the big card's width floor`, () => {
      const { cardWidth } = getCategoryGridMetrics({
        contentWidth,
        isDesktop: true,
        viewportWidth,
      });

      expect(cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.L);
    });
  }
});
