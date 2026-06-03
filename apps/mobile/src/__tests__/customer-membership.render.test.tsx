import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerMembershipScreen reaches expo-router (<Link>) and useCopy (both aliased to
// stubs by vitest.render.config). It does NOT import Sentry/observability. Device locale
// is not under test, so mock expo-localization at the seam — the same defensive pattern
// the customer-category-detail / customer-wallet / customer-auth render tests use — so a
// stray native-module load can't break the mount under happy-dom.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerMembershipScreen } from "@mobile/screens/CustomerMembershipScreen";

// Wave B (cluster B5) per-screen UX adoption for the GoGoPass membership screen
// (monthly/annual plan cards + subscribe CTA). RENDER suite: it MOUNTS the screen
// (react-native -> react-native-web, happy-dom) to prove it still renders after the
// additive changes, AND reads the screen source to assert a behavior/source signal for
// each APPLIED Wave A foundation.
//
// APPLIED here:
//  - haptics.impact() on billing-cycle (Monthly / Annual) selection — the in-screen
//    "selection" action; fire-and-forget, web no-op.
//  - haptics.success() on the subscribe/checkout CTA ("Get ฿X" link) — wired onto an
//    additive onPress; navigation to /pricing still proceeds.
//  - Thai-truncation: numberOfLines on plan/billing titles, perk rows, and FAQ labels
//    that interpolate Thai copy and previously had no line clamp (overflow risk at 320px).
//
// SKIPPED (NOTEs, see the report): pull-to-refresh + skeleton (every string on this
// screen is synchronous parity data — module consts `memberBenefits`/`faqItems` and the
// `webMembershipLanding` `as const` object in webDesignParity.ts; there is NO async
// resource / refetch seam, no loading branch, no CustomerAccountResourceState
// delegation); KeyboardAwareScreen (the screen has no text inputs); toast (no
// copy/clipboard/save action); hitSlop (no icon-only Pressable < 44px — the back link
// carries a "GoGoPass" text label and minHeight: 44).
const membershipSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMembershipScreen.tsx"),
  "utf8"
);

describe("CustomerMembershipScreen (render)", () => {
  it("mounts without throwing", () => {
    expect(() => render(createElement(CustomerMembershipScreen))).not.toThrow();
  });

  it("renders the hero, both billing choices, and the CTA", () => {
    render(createElement(CustomerMembershipScreen));
    expect(screen.getByText("Go premium for less than a coffee a week.")).toBeTruthy();
    expect(screen.getByText("Monthly")).toBeTruthy();
    expect(screen.getByText("Annual")).toBeTruthy();
    // Annual is selected by default → annual CTA label.
    expect(screen.getByText("Get ฿490/year")).toBeTruthy();
  });
});

describe("CustomerMembershipScreen — Wave B foundations adopted (source signals)", () => {
  it("imports the shared haptics utility", () => {
    expect(membershipSource).toContain('from "@mobile/lib/haptics"');
  });

  it("fires impact haptics on billing-cycle selection", () => {
    expect(membershipSource).toContain("haptics.impact(");
  });

  it("fires success haptics on the subscribe/checkout CTA", () => {
    expect(membershipSource).toContain("haptics.success(");
  });

  it("applies numberOfLines Thai-truncation to overflow-prone labels", () => {
    expect(membershipSource).toContain("numberOfLines=");
  });
});
