import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { resolveSearchPopoverFrame } from "@mobile/screens/home/searchPopoverFrame";

// Founder report 2026-07-12: on desktop staging web, focusing the header search
// opened the popular-searches popover stretched across nearly the whole
// viewport. The popover layer is viewport-absolute while the search input
// lives inside the centered 1440px header cap, so `left/right:
// contentHorizontalPadding` has no relation to the input. The popover must
// anchor to the measured search-input frame instead.

const ANCHOR = { height: 44, width: 560, x: 420, y: 18 } as const;

describe("resolveSearchPopoverFrame", () => {
  it("given a measured search anchor > then the popover matches the input's left/width and sits just below it", () => {
    const frame = resolveSearchPopoverFrame({
      anchor: ANCHOR,
      fallbackHorizontalPadding: 40,
      fallbackTop: 70,
      viewportWidth: 1920,
    });

    expect(frame.left).toBe(ANCHOR.x);
    expect(frame.width).toBe(ANCHOR.width);
    expect(frame.top).toBe(ANCHOR.y + ANCHOR.height + 8);
  });

  it("given a wide desktop viewport without an anchor > then the fallback stays capped, never viewport-wide", () => {
    const frame = resolveSearchPopoverFrame({
      anchor: null,
      fallbackHorizontalPadding: 40,
      fallbackTop: 70,
      viewportWidth: 1920,
    });

    // The regression: 1920 - 2*40 = 1840px wide. The fallback must cap at a
    // dropdown-sized panel and center it instead.
    expect(frame.width).toBeLessThanOrEqual(640);
    expect(frame.left).toBeCloseTo((1920 - frame.width) / 2);
    expect(frame.top).toBe(70);
  });

  it("given a narrow viewport without an anchor > then the fallback fits inside the horizontal padding", () => {
    const frame = resolveSearchPopoverFrame({
      anchor: null,
      fallbackHorizontalPadding: 24,
      fallbackTop: 70,
      viewportWidth: 500,
    });

    expect(frame.width).toBe(500 - 24 * 2);
    expect(frame.left).toBe(24);
  });

  it("given an anchor that would overflow the right edge > then the width clamps to the viewport", () => {
    const frame = resolveSearchPopoverFrame({
      anchor: { height: 44, width: 640, x: 700, y: 18 },
      fallbackHorizontalPadding: 40,
      fallbackTop: 70,
      viewportWidth: 1024,
    });

    expect(frame.left).toBe(700);
    expect(frame.width).toBe(1024 - 700);
  });

  it("given a zero-width anchor (not yet laid out) > then it falls back to the capped centered panel", () => {
    const frame = resolveSearchPopoverFrame({
      anchor: { height: 0, width: 0, x: 0, y: 0 },
      fallbackHorizontalPadding: 40,
      fallbackTop: 70,
      viewportWidth: 1920,
    });

    expect(frame.width).toBeLessThanOrEqual(640);
    expect(frame.top).toBe(70);
  });
});

describe("desktop search popover wiring (source signals)", () => {
  const popoverSource = readFileSync(
    resolve(__dirname, "../screens/home/HomeSearchPopularPopover.tsx"),
    "utf8",
  );
  const searchSource = readFileSync(
    resolve(__dirname, "../components/DesktopHeaderSearch.tsx"),
    "utf8",
  );
  const headerSource = readFileSync(
    resolve(__dirname, "../components/CustomerDesktopHeader.tsx"),
    "utf8",
  );
  const homeSource = readFileSync(
    resolve(__dirname, "../screens/CustomerHomeScreen.tsx"),
    "utf8",
  );

  it("the popover positions via resolveSearchPopoverFrame and no longer stretches padding-to-padding", () => {
    expect(popoverSource).toContain("resolveSearchPopoverFrame(");
    expect(popoverSource).not.toContain("right: horizontalPadding");
  });

  it("the header search input measures its window frame and reports changes", () => {
    expect(searchSource).toContain("measureInWindow");
    expect(searchSource).toContain("onSearchFrameChange");
    expect(headerSource).toContain("onSearchFrameChange={onSearchFrameChange}");
  });

  it("the home screen wires the measured frame into the popover (required prop, no silent default)", () => {
    expect(homeSource).toContain("onSearchFrameChange={setSearchAnchorFrame}");
    expect(homeSource).toContain("anchor={searchAnchorFrame}");
    // REQUIRED on purpose: an optional anchor silently reverts to the
    // full-width fallback (the home-hero GoGoLink lesson from PR #244).
    expect(popoverSource).not.toContain("anchor?:");
  });

  it("the popover sources its popular terms from the featured-terms chain, not the raw fixture list", () => {
    expect(popoverSource).toContain("useFeaturedSearchTerms(");
    expect(popoverSource).not.toContain("webHomeSearchPopularPanel.items.map");
  });
});
