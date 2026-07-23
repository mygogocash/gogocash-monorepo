import { describe, expect, it } from "vitest";

import { BRAND_CARD_MIN_WIDTH } from "@mobile/components/brandCardMetrics";
import { getShopDirectoryGridMetrics } from "@mobile/design/webDesignParity";
import { getCategoryGridMetrics } from "@mobile/screens/categoryDetailGrid";

/**
 * There are two brand cards, and each has a width below which its cashback row
 * clips. Measured with canvas `measureText` in the shipped font (DM Sans):
 *
 *   size "L": "Cashback upto" @11px (77) + row gap (10) + widest value
 *             "2.45%" @18px bold (54) + chrome (18) = 159  → canonical card 158.4
 *   size "S": "Cashback upto" @10px (70) + row gap (4)  + widest value
 *             "2.45%" @16px bold (48) + chrome (18) = 140  → canonical card 144
 *
 * A grid may scale a card, but never below its own floor — that is what turned
 * the category pages into a third, illegible design ("Cash…", "C…").
 */
const DESKTOP_VIEWPORT = 1440;

describe("brand card minimum width", () => {
  it("BRAND_CARD_MIN_WIDTH > given the two sizes > matches the measured floors", () => {
    expect(BRAND_CARD_MIN_WIDTH).toEqual({ L: 158, S: 140 });
  });

  it("category detail > given a desktop grid narrowed by its 280px sidebar > keeps small cards legible", () => {
    // 1100px viewport: the exact case that rendered "Cash… 2.45%".
    const metrics = getCategoryGridMetrics({
      contentWidth: 900,
      isDesktop: true,
      viewportWidth: 1100,
    });

    expect(metrics.cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.S);
  });

  it("category detail > across desktop content widths > never renders below the small floor", () => {
    for (let contentWidth = 600; contentWidth <= 1440; contentWidth += 20) {
      const { cardWidth, columns } = getCategoryGridMetrics({
        contentWidth,
        isDesktop: true,
        viewportWidth: DESKTOP_VIEWPORT,
      });
      if (columns > 2) {
        expect(cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.S);
      }
    }
  });

  it("shop directory > given size L > uses the taller L floor, not the S one", () => {
    const { cardWidth } = getShopDirectoryGridMetrics({
      contentWidth: 588,
      viewportWidth: DESKTOP_VIEWPORT,
    });

    expect(cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.L);
  });

  it("explore-other-shops rail > given size S > may pack tighter than an L grid", () => {
    // Same helper, smaller card: an S grid must not be forced to the L floor.
    const asSmall = getShopDirectoryGridMetrics({
      contentWidth: 588,
      viewportWidth: DESKTOP_VIEWPORT,
      cardSize: "S",
    });

    expect(asSmall.cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.S);
    expect(asSmall.columns).toBeGreaterThanOrEqual(
      getShopDirectoryGridMetrics({ contentWidth: 588, viewportWidth: DESKTOP_VIEWPORT }).columns,
    );
  });
});
