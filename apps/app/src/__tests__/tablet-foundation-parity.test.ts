import { describe, expect, it } from "vitest";

import {
  getAccountShellFrameMetrics,
  getCanvasFrame,
  getCanvasWidth,
  getDeviceClass,
  getResponsiveHomeLayoutMetrics,
  getTabletContentFrame,
  mobileShellLayout,
} from "@mobile/design/webDesignParity";

// Tablet tier foundation (regression guard).
//
// The app historically had a binary mobile/desktop split at desktopBreakpoint (1024),
// so portrait tablets (~768-1023px) rendered the stretched phone shell. This pins the
// first-class tablet tier: a canonical device class and a centered content frame for
// single-column screens — while keeping mobile (<768) and desktop (>=1024) untouched.

describe("tablet foundation", () => {
  describe("getDeviceClass > boundaries", () => {
    it("given a phone width (<768) > returns mobile", () => {
      expect(getDeviceClass(0)).toBe("mobile");
      expect(getDeviceClass(390)).toBe("mobile");
      expect(getDeviceClass(767)).toBe("mobile");
    });

    it("given a tablet width (768..1023) > returns tablet", () => {
      expect(getDeviceClass(768)).toBe("tablet");
      expect(getDeviceClass(834)).toBe("tablet"); // iPad portrait points
      expect(getDeviceClass(1023)).toBe("tablet");
    });

    it("given a desktop width (>=1024) > returns desktop", () => {
      expect(getDeviceClass(1024)).toBe("desktop");
      expect(getDeviceClass(1366)).toBe("desktop");
    });
  });

  describe("tablet tokens", () => {
    it("defines a tablet breakpoint that sits below the desktop breakpoint", () => {
      expect(mobileShellLayout.tabletBreakpoint).toBe(768);
      expect(mobileShellLayout.tabletBreakpoint).toBeLessThan(
        mobileShellLayout.desktopBreakpoint
      );
      expect(mobileShellLayout.tabletContentMaxWidth).toBeGreaterThan(0);
      expect(mobileShellLayout.tabletContentHorizontalPadding).toBeGreaterThan(0);
    });
  });

  describe("getTabletContentFrame", () => {
    it("given a tablet width > centers single-column content within a tablet max-width", () => {
      const frame = getTabletContentFrame(834);

      expect(frame.maxWidth).toBe(mobileShellLayout.tabletContentMaxWidth);
      expect(frame.maxWidth).toBeLessThan(834); // does NOT stretch to the viewport
      expect(frame.horizontalPadding).toBe(
        mobileShellLayout.tabletContentHorizontalPadding
      );
      // centered: equal gutters on each side
      expect(frame.offset).toBeCloseTo((834 - frame.maxWidth) / 2, 2);
      // inner content fits inside the frame after padding
      expect(frame.contentWidth).toBe(frame.maxWidth - frame.horizontalPadding * 2);
      expect(frame.contentWidth).toBeGreaterThan(0);
    });

    it("given a width narrower than the max-width > the frame never exceeds the viewport", () => {
      const frame = getTabletContentFrame(600);

      expect(frame.maxWidth).toBe(600);
      expect(frame.offset).toBe(0);
    });
  });

  describe("non-regression: mobile and desktop home metrics are unchanged", () => {
    // Pin a couple of representative outputs so the additive tablet work cannot
    // silently shift the existing phone/desktop home layout.
    it("phone (390) keeps the mobile shell (isDesktop false, bottom nav shown)", () => {
      const m = getResponsiveHomeLayoutMetrics(390);
      expect(m.isDesktop).toBe(false);
      expect(m.showBottomNav).toBe(true);
    });

    it("desktop (1440) keeps the desktop shell (isDesktop true, bottom nav hidden)", () => {
      const m = getResponsiveHomeLayoutMetrics(1440);
      expect(m.isDesktop).toBe(true);
      expect(m.showBottomNav).toBe(false);
    });
  });
});

describe("AccountPageShell tablet frame (covers the 17 shared-shell screens)", () => {
  it("phone (390) keeps the full-bleed mobile frame", () => {
    expect(getAccountShellFrameMetrics(390)).toEqual({
      maxWidth: mobileShellLayout.contentMaxWidth,
      paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
    });
  });

  it("tablet (834) caps + centers single-column shell content (not stretched phone)", () => {
    expect(getAccountShellFrameMetrics(834)).toEqual({
      maxWidth: mobileShellLayout.tabletContentMaxWidth,
      paddingHorizontal: mobileShellLayout.tabletContentHorizontalPadding,
    });
  });

  it("tablet (834) with tabletFluid keeps full width (grid screens like Quest opt out)", () => {
    expect(getAccountShellFrameMetrics(834, { tabletFluid: true })).toEqual({
      maxWidth: mobileShellLayout.contentMaxWidth,
      paddingHorizontal: mobileShellLayout.contentHorizontalPadding,
    });
  });

  it("desktop rail page (1280) is unchanged (navbar-aligned cap)", () => {
    expect(getAccountShellFrameMetrics(1280, { alignToNavbarShell: true })).toEqual({
      maxWidth: mobileShellLayout.desktopContentMaxWidth,
      paddingHorizontal: getDesktopShellHorizontalPaddingProbe(1280),
    });
  });

  it("desktop non-rail page (1280) is unchanged (legacy 1180 cap)", () => {
    const frame = getAccountShellFrameMetrics(1280);
    expect(frame.maxWidth).toBe(1180);
    expect(frame.paddingHorizontal).toBe(mobileShellLayout.desktopContentHorizontalPadding);
  });
});

// Local mirror of the desktop padding rule (avoids importing an extra symbol just
// to assert the unchanged desktop branch).
function getDesktopShellHorizontalPaddingProbe(width: number): number {
  if (width >= 1200) return mobileShellLayout.desktopHeaderPaddingMax;
  return mobileShellLayout.desktopHeaderPaddingMin;
}

describe("home Top Brands grid columns by device (tablet cards must not balloon)", () => {
  // The Top Brands carousel previously used 3 columns across the entire 480-1279px
  // range, so on a wide tablet (~960px) each card grew to ~288px. The tablet band
  // (768-1023) now uses 4 columns so cards stay a sensible size.
  it("phone <480 (390) > 2 columns (unchanged)", () => {
    expect(getResponsiveHomeLayoutMetrics(390).topBrandColumns).toBe(2);
  });

  it("large phone 480-767 (600) > 3 columns (unchanged)", () => {
    expect(getResponsiveHomeLayoutMetrics(600).topBrandColumns).toBe(3);
  });

  it("tablet 768-1023 (834, 960) > 4 columns (smaller cards, was 3)", () => {
    expect(getResponsiveHomeLayoutMetrics(834).topBrandColumns).toBe(4);
    expect(getResponsiveHomeLayoutMetrics(960).topBrandColumns).toBe(4);
  });

  it("desktop band 1024-1279 (1100) > 6 columns (full desktop grid, no balloon)", () => {
    expect(getResponsiveHomeLayoutMetrics(1100).topBrandColumns).toBe(6);
  });

  it("wide desktop >=1280 (1440) > 6 columns (unchanged)", () => {
    expect(getResponsiveHomeLayoutMetrics(1440).topBrandColumns).toBe(6);
  });
});

describe("home banner aspect ratio (full 1920x1080 design, fit to width, no crop)", () => {
  // Promotion banners are designed at 1920x1080 (16:9). They must show the FULL
  // design fit to width on every class — size is controlled by the per-class
  // canvas width, never by cropping the banner.
  it("the banner ratio is 16:9 (1920/1080)", () => {
    expect(mobileShellLayout.homeBannerAspectRatio).toBeCloseTo(1920 / 1080, 5);
    expect(mobileShellLayout.homeSideBannerAspectRatio).toBeCloseTo(1920 / 1080, 5);
  });

  it("every class shows the full 16:9 banner (no tablet crop)", () => {
    for (const w of [390, 834, 1440]) {
      expect(getResponsiveHomeLayoutMetrics(w).mainBannerAspectRatio).toBe(
        mobileShellLayout.homeBannerAspectRatio
      );
    }
  });
});

describe("centered canvas — fixed content width per class (gutters absorb extra width)", () => {
  describe("getCanvasWidth", () => {
    it("below a class fixed width > content fills the viewport (no overflow)", () => {
      expect(getCanvasWidth(360)).toBe(360); // mobile, < 430
      expect(getCanvasWidth(800)).toBe(800); // tablet, < 820
      expect(getCanvasWidth(1100)).toBe(1100); // desktop, < 1280
    });

    it("at/above the class fixed width > content locks at the fixed width", () => {
      expect(getCanvasWidth(700)).toBe(mobileShellLayout.canvasMobileWidth); // mobile-class wide window -> 430
      expect(getCanvasWidth(1000)).toBe(mobileShellLayout.canvasTabletWidth); // tablet -> 820
      expect(getCanvasWidth(1920)).toBe(mobileShellLayout.canvasDesktopWidth); // desktop -> 1280
    });

    it("two windows in the same class above the fixed width > identical content width", () => {
      expect(getCanvasWidth(1400)).toBe(getCanvasWidth(1920)); // both desktop -> 1280
      expect(getCanvasWidth(860)).toBe(getCanvasWidth(1020)); // both tablet -> 820
    });
  });

  describe("getCanvasFrame", () => {
    it("centers the canvas: equal gutters absorb the extra width", () => {
      const frame = getCanvasFrame(1920);
      expect(frame.width).toBe(1280);
      expect(frame.offset).toBe((1920 - 1280) / 2); // 320 each side
    });

    it("no gutters when the viewport is at or below the fixed width", () => {
      expect(getCanvasFrame(800).offset).toBe(0); // tablet, fills
      expect(getCanvasFrame(360).offset).toBe(0); // mobile, fills
    });
  });
});
