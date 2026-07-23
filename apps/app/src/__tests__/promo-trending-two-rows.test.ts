import { describe, expect, it, vi } from "vitest";

// homeHelpers statically pulls in homeAssets (real .png + phosphor icon imports),
// none of which the trending-cap logic touches. Stub it at the seam exactly like
// hero-banner-image.test.ts so this stays a fast node-suite unit test.
vi.mock("../screens/home/homeAssets", () => ({
  heroBannerAssets: {},
  brandLogoAssets: {},
}));

import { getResponsiveHomeLayoutMetrics } from "@mobile/design/webDesignParity";
import {
  getPromoSectionCards,
  getPromoSectionRowsPerPage,
} from "@mobile/screens/home/homeHelpers";
import { type CompactBrandLogoOfferCardProps } from "@mobile/screens/home/homeTypes";

// Founder request 2026-07-23: the HOME "Trending Brands" rail spread ~20 backend cards
// across a multi-page pager / long horizontal rail. Cap it to exactly two rows per
// breakpoint (desktop 6 cols, tablet 4, mobile 2 -> 12 / 8 / 4 cards); the overflow stays
// reachable via the section's "View all ->" link. Top Brands, Travel and Makeup untouched.
function cards(count: number): CompactBrandLogoOfferCardProps[] {
  return Array.from({ length: count }, (_, index) => ({
    brand: `Brand ${index}`,
    cashback: "5.0%",
    logoUri: undefined,
    tint: "#eeeeee",
  }));
}

const desktop = getResponsiveHomeLayoutMetrics(1404);
const tablet = getResponsiveHomeLayoutMetrics(820);
const mobile = getResponsiveHomeLayoutMetrics(390);

describe("getPromoSectionCards > Trending two-row cap", () => {
  it("given trending on desktop (6 columns) > then caps to two rows (12 cards)", () => {
    expect(getPromoSectionCards("trending", cards(20), desktop)).toHaveLength(12);
  });

  it("given trending on tablet (4 columns) > then caps to two rows (8 cards)", () => {
    expect(getPromoSectionCards("trending", cards(20), tablet)).toHaveLength(8);
  });

  it("given trending on mobile (2 columns) > then caps to two rows (4 cards)", () => {
    expect(getPromoSectionCards("trending", cards(20), mobile)).toHaveLength(4);
  });

  it("given any breakpoint > then the cap derives from columns-per-row x two rows, not a constant", () => {
    for (const layout of [desktop, tablet, mobile]) {
      expect(getPromoSectionCards("trending", cards(20), layout)).toHaveLength(
        layout.topBrandDesignColumns * layout.topBrandRowsPerPage,
      );
    }
  });

  it("given trending with fewer cards than the cap > then returns them all", () => {
    expect(getPromoSectionCards("trending", cards(3), desktop)).toHaveLength(3);
  });
});

describe("getPromoSectionCards > other sections stay untouched", () => {
  it("given the one-row Travel rail > then it still caps at 16 and stays one row", () => {
    expect(getPromoSectionCards("travel", cards(20), desktop)).toHaveLength(16);
    expect(getPromoSectionRowsPerPage("travel", desktop)).toBe(1);
  });

  it("given the one-row Makeup rail > then it still caps at 16 and stays one row", () => {
    expect(getPromoSectionCards("makeup", cards(20), desktop)).toHaveLength(16);
    expect(getPromoSectionRowsPerPage("makeup", desktop)).toBe(1);
  });

  it("given any other section id > then every card is returned uncapped", () => {
    expect(getPromoSectionCards("something-else", cards(20), desktop)).toHaveLength(20);
  });
});
