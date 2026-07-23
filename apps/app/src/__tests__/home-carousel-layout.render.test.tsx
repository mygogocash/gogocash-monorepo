import { describe, expect, it } from "vitest";

import { BRAND_CARD_MIN_WIDTH } from "@mobile/components/brandCardMetrics";
import {
  getPromoGridCardWidth,
  getPromoSectionLayoutMode,
  getTopBrandGridMetrics,
  getTopBrandSectionLayoutMode,
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

describe("getTopBrandSectionLayoutMode", () => {
  it("given a phone catalog of any size > then shows every Top Brand in the vertical grid", () => {
    const phone = getResponsiveHomeLayoutMetrics(390);
    expect(getTopBrandSectionLayoutMode(phone, 1)).toBe("grid");
    expect(getTopBrandSectionLayoutMode(phone, 40)).toBe("grid");
  });

  it("given tablet or either desktop width tier > then preserves the existing rail behavior", () => {
    const tablet = getResponsiveHomeLayoutMetrics(834);
    const desktopShellWithTabletDesign = getResponsiveHomeLayoutMetrics(1100);
    const wideDesktop = getResponsiveHomeLayoutMetrics(1440);

    expect(getTopBrandSectionLayoutMode(tablet, 4)).toBe("grid");
    expect(getTopBrandSectionLayoutMode(tablet, 5)).toBe("scroll");
    expect(desktopShellWithTabletDesign.designVersion).toBe("tablet");
    expect(desktopShellWithTabletDesign.isDesktop).toBe(true);
    expect(getTopBrandSectionLayoutMode(desktopShellWithTabletDesign, 40)).toBe("pager");
    expect(getTopBrandSectionLayoutMode(wideDesktop, 40)).toBe("pager");
  });
});

describe("getTopBrandGridMetrics", () => {
  it("given a common phone viewport > then two large cards use the full content frame and clear their width floor", () => {
    const metrics = getTopBrandGridMetrics(getResponsiveHomeLayoutMetrics(390));

    expect(metrics.columns).toBe(2);
    expect(metrics.cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.L);
  });

  it("given a 320px reflow viewport > then falls back to one centered large card without horizontal scrolling", () => {
    const metrics = getTopBrandGridMetrics(getResponsiveHomeLayoutMetrics(320));

    expect(metrics.columns).toBe(1);
    expect(metrics.cardWidth).toBeGreaterThanOrEqual(BRAND_CARD_MIN_WIDTH.L);
  });

  it("given a wide phone or foldable viewport > then exposes a centered capped frame with two balanced columns", () => {
    for (const viewportWidth of [600, 767]) {
      const layout = getResponsiveHomeLayoutMetrics(viewportWidth);
      const metrics = getTopBrandGridMetrics(layout);
      const renderedSheetWidth = viewportWidth - 48;

      expect(metrics.columns).toBe(2);
      expect(metrics.frameWidth).toBeLessThan(renderedSheetWidth);
      expect(metrics.cardWidth * 2 + layout.topBrandGap).toBe(metrics.frameWidth);
    }
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
