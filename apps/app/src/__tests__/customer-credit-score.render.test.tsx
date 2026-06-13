import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerCreditScoreScreen renders inside AccountPageShell, which reaches i18n/LocaleProvider
// (-> CustomerLocaleRegionControl -> expo-localization -> expo-modules-core, which touches the
// native `expo` global that does not exist under happy-dom: "__DEV__ is not defined"). Device
// locale is not under test, so mock the module at the seam — the same pattern the sibling
// quest/wallet/auth render tests use. (No @mobile/observability mock needed: this screen does
// not import Sentry — verified in source.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerCreditScoreScreen } from "@mobile/screens/CustomerCreditScoreScreen";

// Wave B (B5) per-screen UX adoption for the "My Rating Score" credit dashboard (score hero,
// tier-progress card, points breakdown, benefit groups, streak + boost cards).
// RENDER suite: it MOUNTS the screen to prove it still renders after the additive changes, AND
// reads the screen source to assert a behavior/source signal for each applied Wave A foundation.
//
// useCopy is stubbed to a passthrough in the render harness (vitest.render.config.ts), so
// tc("...") returns the English literal verbatim — getByText asserts against English copy.
//
// Applied here:
//  - haptics.impact() on the screen's key CTAs: the breakdown row CTAs ("Start earning →" /
//    "Complete profile →") and the boost-card CTA. Each is a `Link asChild` navigation, so the
//    haptic is wired onto the inner Pressable's onPress (an additive selection cue) — the Link
//    still drives navigation. impact() (not success()) is the meaningful cue: these are
//    navigations to other screens, not a confirmation of a completed action on THIS screen.
//  - Thai-truncation: numberOfLines on the copy that grows in Thai inside fixed-size chrome —
//    the tier label + points-to-trusted line, the score-row title/sublabel, the benefit
//    title/note, the streak month-row label, and the boost body.
//  - hitSlop: the breakdown row CTA (styles.rowCta) declares minHeight:38 (< the 44px tap
//    target), so it gets a hitSlop. (The top-bar back control has minHeight:48 AND a text label
//    beside the chevron, and the boost button has minHeight:48 — both already clear 44px.)
//
// Intentionally NOT adopted (NOTE for reviewer):
//  - useReducedMotion gate: the screen has NO screen-local Animated. ProgressTrack is a static
//    <View> with a fixed `width` (no gauge-fill / progress animation), and MotionPressable is
//    not used here. There is no motion to gate — adding the hook would be dead code. Skipped.
//  - Skeleton + Pull-to-refresh (RefreshControl): the entire screen renders from SYNCHRONOUS
//    design-parity data (webCreditScorePage, `as const`). It owns NO async resource, does NOT
//    use useCustomerAccountResource, and has no refetch — there is nothing to refresh or to
//    render a skeleton into. Same conclusion as the sibling B4/B5 static screens. Skipped.
//  - KeyboardAwareScreen: no text inputs on this screen. Skipped.
const creditScoreSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerCreditScoreScreen.tsx"),
  "utf8"
);

describe("CustomerCreditScoreScreen (render)", () => {
  it("mounts the credit-score dashboard without throwing", () => {
    expect(() => render(createElement(CustomerCreditScoreScreen))).not.toThrow();
  });

  it("renders the hero score, breakdown, benefits, streak and boost sections", () => {
    render(createElement(CustomerCreditScoreScreen));
    // Hero label + breakdown/benefit section headings come straight from webCreditScorePage.
    expect(screen.getByText("Your GoGoPass Score")).toBeTruthy();
    expect(screen.getByText("Earn more points")).toBeTruthy();
    expect(screen.getByText("What you get")).toBeTruthy();
    // The "Start earning →" CTA appears on both breakdown rows and the boost card (the
    // haptic-wired navigation controls), so assert at least one is present.
    expect(screen.getAllByText("Start earning →").length).toBeGreaterThan(0);
  });
});

describe("CustomerCreditScoreScreen — Wave B (B5) foundations adopted (source signals)", () => {
  it("imports haptics and fires impact() on the screen's key CTAs", () => {
    // Wired onto the EXISTING row-CTA + boost-CTA Pressables (a selection cue), not a new path.
    expect(creditScoreSource).toContain('from "@mobile/lib/haptics"');
    expect(creditScoreSource).toContain("haptics.impact(");
  });

  it("fires the impact() haptic from the boost CTA Pressable onPress", () => {
    // The boost button is the primary CTA — its Pressable must fire the haptic on press.
    // Format-agnostic (\s*[\s\S]*?) so a Prettier reflow doesn't break the assertion.
    expect(creditScoreSource).toMatch(
      /onPress=\{\(\) => \{?\s*[\s\S]*?haptics\.impact\(\)[\s\S]*?style=\{styles\.boostButton\}/
    );
  });

  it("caps the tier label and points-to-trusted copy with numberOfLines (Thai truncation)", () => {
    // "Starter" / "40 more points to Trusted 💜" grow in Thai under the centered hero.
    // Format-agnostic: assert numberOfLines={1} co-occurs with the style on the same <Text>.
    expect(creditScoreSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.tierLabel\}/);
    expect(creditScoreSource).toMatch(/numberOfLines=\{[12]\}\s+style=\{styles\.mutedCenter\}/);
  });

  it("caps the score-row title/sublabel and benefit title/note with numberOfLines", () => {
    // Breakdown rows + benefit cards have fixed-height chrome; their copy overflows in Thai.
    expect(creditScoreSource).toMatch(/numberOfLines=\{[12]\}\s+style=\{styles\.scoreRowTitle\}/);
    expect(creditScoreSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.scoreRowSub\}/);
    expect(creditScoreSource).toMatch(/numberOfLines=\{[12]\}\s+style=\{styles\.benefitTitle\}/);
    expect(creditScoreSource).toMatch(/numberOfLines=\{[12]\}\s+style=\{styles\.benefitNote\}/);
  });

  it("gives the row CTA a hitSlop for a comfortable tap target", () => {
    // styles.rowCta is 44px (web h-11 parity); the hitSlop keeps the target generous.
    expect(creditScoreSource).toContain("hitSlop=");
    expect(creditScoreSource).toMatch(/hitSlop=[\s\S]*?style=\{styles\.rowCta\}/);
  });

  it("aligns to the web desktop design: centered 672px column, web heading ink, gradient fills, streak pills", () => {
    // Desktop centers the page in a max-w-2xl (672px) column like the web client container.
    expect(creditScoreSource).toContain("contentDesktop");
    expect(creditScoreSource).toContain("maxWidth: 672");
    // Score + section headings use the web's dark heading green; the score carries the
    // heaviest weight the app's typography rule allows (800 — no true 900 in DM Sans).
    expect(creditScoreSource).toContain('"#103522"');
    expect(creditScoreSource).toMatch(/scoreValue: \{[\s\S]*?fontWeight: "800"/);
    // Progress fills carry the web's #00AA80→#00CC99 gradient (web-only backgroundImage).
    expect(creditScoreSource).toContain("progressFillGradient");
    expect(creditScoreSource).toContain("linear-gradient(to right, #00AA80, #00CC99)");
    // Streak tracker: connector lines join the month dots; month status renders as colored pills.
    expect(creditScoreSource).toContain("monthConnector");
    expect(creditScoreSource).toContain("monthStatusPill");
    expect(creditScoreSource).toContain('"#FEF3C7"');
    // Mint card borders use the web --gc-border-mint token.
    expect(creditScoreSource).toContain('"#B7E7DB"');
    expect(creditScoreSource).not.toContain('"#B7F0DC"');
  });
});
