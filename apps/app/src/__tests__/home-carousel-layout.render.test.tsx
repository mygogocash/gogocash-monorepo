import { describe, expect, it } from "vitest";

import {
  getPromoGridCardWidth,
  getPromoSectionLayoutMode,
} from "@mobile/screens/home/homeHelpers";
import { getResponsiveHomeLayoutMetrics } from "@mobile/design/webDesignParity";

// Founder feedback 2026-07-11: on the phone the promo rails snapped by a whole
// 8-column group (~4 screens wide), so a partial swipe yanked back hard, and a
// 4-card section (Travel Deals) hid half its cards behind a swipe. Mobile now
// has two modes: sections whose cards all fit render a static 2-column grid
// ("grid" — no swiping at all); longer rails scroll freely with natural
// momentum ("scroll"). Desktop keeps the paged group ("pager").
describe("getPromoSectionLayoutMode", () => {
  it("given desktop > then always pages (unchanged web-parity pager)", () => {
    expect(getPromoSectionLayoutMode(true, 4)).toBe("pager");
    expect(getPromoSectionLayoutMode(true, 40)).toBe("pager");
  });

  it("given mobile with four or fewer cards > then shows them all in a static grid", () => {
    expect(getPromoSectionLayoutMode(false, 4)).toBe("grid");
    expect(getPromoSectionLayoutMode(false, 2)).toBe("grid");
    expect(getPromoSectionLayoutMode(false, 1)).toBe("grid");
  });

  it("given mobile with more cards than fit > then free-scrolls without snapping", () => {
    expect(getPromoSectionLayoutMode(false, 5)).toBe("scroll");
    expect(getPromoSectionLayoutMode(false, 16)).toBe("scroll");
  });
});

describe("getPromoGridCardWidth", () => {
  it("given the section frame > then two columns fill it exactly (floored)", () => {
    expect(getPromoGridCardWidth(358, 16)).toBe(171);
    expect(getPromoGridCardWidth(343, 16)).toBe(163);
  });
});

describe("getResponsiveHomeLayoutMetrics rows-per-page", () => {
  it("given any viewport > then exposes the compact and top-brand row counts the rails flow into", () => {
    const mobile = getResponsiveHomeLayoutMetrics(390);
    const desktop = getResponsiveHomeLayoutMetrics(1280);
    expect(mobile.compactBrandRowsPerPage).toBe(2);
    expect(desktop.compactBrandRowsPerPage).toBe(2);
    expect(mobile.topBrandRowsPerPage).toBe(2);
  });
});
