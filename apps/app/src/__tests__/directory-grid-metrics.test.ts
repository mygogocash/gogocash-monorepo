import { describe, expect, it } from "vitest";

import { getShopDirectoryGridMetrics } from "@mobile/design/webDesignParity";

/**
 * Minimum legible card width, measured with canvas `measureText` in the shipped
 * font (DM Sans) against the real BrandCard size-"L" box model:
 *
 *   "Cashback upto" caption  77.0
 * + brandCashbackRow gap     10.0
 * + widest cashback ("2.45%") 54.0
 * + card chrome (8px padding + 1px border, both sides) 18.0
 * = 159.0
 *
 * Below this the caption truncates to "Cashb…" / "Cas…". It lands within a
 * rounding error of the directory card's own 158.4px design width.
 */
const MIN_LEGIBLE_CARD_WIDTH = 158;

/** The brand + shop directories both render a ~280px category aside. */
const DESKTOP_WITH_ASIDE = { contentWidth: 588, viewportWidth: 1440 };

describe("directory grid metrics", () => {
  it("getShopDirectoryGridMetrics > given a desktop viewport but an aside-narrowed grid > keeps cards legible", () => {
    const { cardWidth } = getShopDirectoryGridMetrics(DESKTOP_WITH_ASIDE);

    expect(cardWidth).toBeGreaterThanOrEqual(MIN_LEGIBLE_CARD_WIDTH);
  });

  it("getShopDirectoryGridMetrics > given an aside-narrowed grid > drops columns instead of shrinking cards", () => {
    const { columns } = getShopDirectoryGridMetrics(DESKTOP_WITH_ASIDE);

    // 5 columns is the desktop maximum and only fits a full-width grid.
    expect(columns).toBeLessThan(5);
  });

  it("getShopDirectoryGridMetrics > given a full-width desktop grid > still uses all 5 columns", () => {
    expect(getShopDirectoryGridMetrics({ contentWidth: 1200, viewportWidth: 1440 })).toEqual({
      cardWidth: 220.8,
      columns: 5,
      gap: 24,
    });
  });

  it("getShopDirectoryGridMetrics > given a narrow phone > never collapses below two columns", () => {
    // A single full-bleed card per row would be a worse regression than a
    // slightly tight one, so 2 is the floor no matter how narrow the screen.
    for (const contentWidth of [280, 300, 320, 360]) {
      expect(getShopDirectoryGridMetrics({ contentWidth, viewportWidth: 390 }).columns).toBe(2);
    }
  });

  it("getShopDirectoryGridMetrics > across desktop content widths > every multi-column grid stays legible", () => {
    for (let contentWidth = 400; contentWidth <= 1400; contentWidth += 20) {
      const { cardWidth, columns } = getShopDirectoryGridMetrics({
        contentWidth,
        viewportWidth: 1440,
      });
      if (columns > 2) {
        expect(cardWidth).toBeGreaterThanOrEqual(MIN_LEGIBLE_CARD_WIDTH);
      }
    }
  });
});
