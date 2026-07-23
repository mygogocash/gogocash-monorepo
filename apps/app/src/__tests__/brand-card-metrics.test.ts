import { describe, expect, it } from "vitest";

import { getBrandCardLargeHeight } from "@mobile/components/brandCardMetrics";
import { getDirectoryStoreCardHeight } from "@mobile/screens/discovery/directoryVirtualizedGrid";

/**
 * Measured in a browser from a rendered size-"L" BrandCard (Expo web export):
 * a 98.4px-wide card's content ends 148.9px down — border(1) + padding(8) +
 * square logo tile(cardWidth - 18) + marginTop(6) + title(20) + marginTop(6) +
 * cashback row(18.5) + padding(8) + border(1).
 */
const MEASURED_CARD_WIDTH = 98.4;
const MEASURED_CONTENT_HEIGHT = 148.9;

describe("brand card metrics", () => {
  it("getBrandCardLargeHeight > given the measured card > reserves enough for the content", () => {
    expect(getBrandCardLargeHeight(MEASURED_CARD_WIDTH)).toBeGreaterThanOrEqual(
      MEASURED_CONTENT_HEIGHT,
    );
  });

  it("getBrandCardLargeHeight > given the measured card > leaves no visible gap under the content", () => {
    const slack = getBrandCardLargeHeight(MEASURED_CARD_WIDTH) - MEASURED_CONTENT_HEIGHT;

    // A couple of px of rounding tolerance is fine; 40px of dead space is the bug.
    expect(slack).toBeLessThanOrEqual(4);
  });

  it("getBrandCardLargeHeight > given the unified card > reserves less than the legacy bespoke card", () => {
    // BrandCard has a single-line name; the legacy ShopDirectoryStoreCard reserves
    // a two-line name (minHeight 38) plus a taller cashback row.
    expect(getBrandCardLargeHeight(MEASURED_CARD_WIDTH)).toBeLessThan(
      getDirectoryStoreCardHeight(MEASURED_CARD_WIDTH),
    );
  });

  it("getBrandCardLargeHeight > given a wider card > grows 1:1 because the logo tile is square", () => {
    expect(getBrandCardLargeHeight(210) - getBrandCardLargeHeight(200)).toBeCloseTo(10);
  });
});
