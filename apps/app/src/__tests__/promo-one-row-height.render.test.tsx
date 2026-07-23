import { describe, expect, it } from "vitest";

import {
  getPromoSectionPageSize,
  getPromoSectionRowsPerPage,
  getPromoSectionGridHeight,
} from "@mobile/screens/home/homeHelpers";
import { getResponsiveHomeLayoutMetrics } from "@mobile/design/webDesignParity";

// #499 — "Travel Deals are Here!" and "Makeup Must Have!" are one-row sections, but
// ONE_ROW_PROMO_SECTION_IDS only capped their CARD COUNT. Row count came from the global
// topBrandRowsPerPage (2), and PromoSection hard-coded homeLayout.topBrandGridHeight for
// its body, scroll and page heights — so a one-row rail still reserved two rows of height
// and left a large empty gap before the next section.
//
// Row count is a SECTION property, not a viewport one: topBrandRowsPerPage is also read by
// TopBrandSection, so changing it there would resize Top Brands too. These helpers keep the
// per-section decision in homeHelpers and leave the global metric alone.
const layout = getResponsiveHomeLayoutMetrics(1404);

describe("one-row promo sections (#499)", () => {
  it("given travel or makeup > then the section is one row", () => {
    expect(getPromoSectionRowsPerPage("travel", layout)).toBe(1);
    expect(getPromoSectionRowsPerPage("makeup", layout)).toBe(1);
  });

  it("given any other section > then it keeps the shared two-row rhythm", () => {
    expect(getPromoSectionRowsPerPage("trending", layout)).toBe(
      layout.topBrandRowsPerPage,
    );
  });

  it("given a one-row section > then its height is a single card, with no gap term", () => {
    const oneRow = getPromoSectionGridHeight("travel", layout);

    expect(oneRow).toBe(layout.topBrandCardHeight);
    // The empty gap in the ticket is precisely the second row plus the row gap.
    expect(oneRow).toBeLessThan(layout.topBrandGridHeight);
  });

  it("given a two-row section > then its height still matches the shared metric", () => {
    expect(getPromoSectionGridHeight("trending", layout)).toBe(
      layout.topBrandGridHeight,
    );
  });

  it("given a one-row section > then its page holds one row of columns", () => {
    expect(getPromoSectionPageSize("travel", layout)).toBe(layout.topBrandColumns);
    expect(getPromoSectionPageSize("trending", layout)).toBe(
      layout.topBrandCardsPerPage,
    );
  });
});
