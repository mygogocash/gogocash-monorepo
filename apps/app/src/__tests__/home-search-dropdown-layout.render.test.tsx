import { describe, expect, it } from "vitest";

import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { lightColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";

// #494 — two asks against the desktop search dropdown.
//
// NOTE the ticket points at DesktopHeaderSearch.tsx, which is only the input shell and
// renders no dropdown at all. The dropdown is screens/home/HomeSearchPopularPopover.tsx
// composing HomeSearchIntro + HomeSearchResultRow, styled from customerHomeStyles.
//
// 1. "Popular right now" acts as a section label but was rendered as a full promo card
//    (tinted background, border, 96px min-height, trending icon), which made the dropdown
//    feel heavy. It should read as a plain text heading — the idiom already used five
//    lines away for "Matching brands & products" (styles.searchResultsHeading).
//
// 2. In each result row the cashback VALUE drifted to the far right, visually closer to
//    the Shop Now CTA than to its own "Cashback upto" label. The cause is not
//    justify-content: it is `flex: 1` on the caption (absorbing all slack) plus
//    `flexWrap: "wrap"` (letting the value drop to its own line under pressure).
const styles = createHomeScreenStyles(lightColors, getThemeSurfaces(lightColors, "light"));

/** The issue asks for roughly 2-4px between the label and its value. */
const GROUPED_GAP_MAX = 4;

describe("home search dropdown (#494)", () => {
  describe("popular intro reads as a section heading, not a card", () => {
    const intro = styles.searchPopoverIntro as Record<string, unknown>;

    it("given the intro > then it has no card background or border", () => {
      expect(intro.backgroundColor).toBeUndefined();
      expect(intro.borderWidth).toBeUndefined();
    });

    it("given the intro > then it does not reserve promo-card height", () => {
      // 96/82px of reserved height is what made a section label look like a promo block.
      expect(intro.minHeight).toBeUndefined();
    });
  });

  describe("cashback value stays grouped with its label", () => {
    const row = styles.searchResultCashbackRow as Record<string, unknown>;
    const caption = styles.searchResultCaption as Record<string, unknown>;

    it("given the cashback row > then the caption does not absorb the slack", () => {
      // flex: 1 on the caption is what pushed the percentage to the right edge.
      expect(caption.flex).toBeUndefined();
    });

    it("given the cashback row > then it cannot wrap the value onto its own line", () => {
      expect(row.flexWrap).toBeUndefined();
    });

    it("given the cashback row > then label and value sit within a grouped gap", () => {
      expect(row.gap as number).toBeLessThanOrEqual(GROUPED_GAP_MAX);
    });

    it("given the cashback value > then it still refuses to shrink", () => {
      // Pinned by perf-wave4.test.ts:161 — regrouping must not cost the value its width.
      expect((styles.searchResultCashback as Record<string, unknown>).flexShrink).toBe(0);
    });
  });
});
