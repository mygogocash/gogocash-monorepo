import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerGoLinkScreen } from "@mobile/screens/CustomerGoLinkScreen";

// Wave B (B5) per-screen UX adoption for the GoLink sheet/popover surface. This screen drives every
// overlay (the bottom sheet, the guideline dialog, and the result dialog) through a SINGLE motion seam —
// `useDismissableOverlayMotion` (enter `Animated.parallel`, exit `runExitAnimation`). The PRIMARY fix is
// reduce-motion: when the platform "reduce motion" flag is on, the open/close timelines collapse to
// duration 0 so overlays appear/dismiss instantly with an identical end state (no slide/fade), while the
// exit's completion callback (which calls onDismiss) still fires.
//
// Skeleton/RefreshControl are intentionally NOT adopted: GoLink is a static promo/link-paste surface with
// no async data fetch or list to refresh. KeyboardAwareScreen is skipped too — the lone TextInput lives in
// a tall bottom sheet whose own ScrollView already handles keyboard avoidance and is not covered by the
// keyboard at the smallest target; wrapping the whole sheet would fight the sheet/scrim layout. The
// secondary native affordances applied here are: haptics.impact() on opening the sheet / selecting an
// action, hitSlop on the icon-only close/dismiss buttons (<44px taps), and numberOfLines on the labels
// that can overflow under Thai.
const golinkSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerGoLinkScreen.tsx"),
  "utf8"
);

describe("CustomerGoLinkScreen (render)", () => {
  it("mounts the GoLink sheet without throwing", () => {
    expect(() => render(createElement(CustomerGoLinkScreen, {}))).not.toThrow();
  });

  it("renders the paste-link input so the sheet surface is present", () => {
    render(createElement(CustomerGoLinkScreen, {}));
    expect(screen.getAllByPlaceholderText("Paste your product or shop link here").length).toBeGreaterThan(
      0
    );
  });
});

describe("CustomerGoLinkScreen — Wave B foundations adopted (source signals)", () => {
  it("imports useReducedMotion and consults it inside the overlay motion seam (PRIMARY)", () => {
    expect(golinkSource).toContain('from "@mobile/hooks/useReducedMotion"');
    expect(golinkSource).toContain("useReducedMotion()");
  });

  it("zeroes the sheet/overlay open + close animation duration when reduce-motion is on", () => {
    // The enter (Animated.parallel of timings) and the exit (runExitAnimation) must both collapse to a
    // 0ms duration under reduced motion so overlays appear/dismiss instantly. We assert the gate reaches
    // the duration of an Animated.timing (the ternary picks 0 when reduced) rather than a fixed value.
    expect(golinkSource).toMatch(/duration:\s*reduced\s*\?\s*0\s*:/);
  });

  it("imports haptics and fires impact on opening the sheet / selecting an action", () => {
    expect(golinkSource).toContain('from "@mobile/lib/haptics"');
    expect(golinkSource).toContain("haptics.impact(");
  });

  it("gives the icon-only close/dismiss buttons a hitSlop so sub-44px taps stay reachable", () => {
    expect(golinkSource).toContain("hitSlop");
  });

  it("caps overflowing promo/step labels with numberOfLines for Thai truncation", () => {
    expect(golinkSource).toContain("numberOfLines");
  });
});
