import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerWithdrawMethodScreen } from "@mobile/screens/CustomerWithdrawMethodScreen";

// Render coverage for the withdrawal-methods screen — an AccountPageShell screen,
// mountable since the harness stubs react-native-safe-area-context (2c4be85).
// Mounts the screen (react-native -> react-native-web, happy-dom) and asserts the
// exact webWithdrawMethodPage fixture content. NOTE: the screen renders bank name +
// masked account in ONE <Text> with a "  ·  " separator and a NESTED <Text> for the
// account tail (screen lines 94-98), so getByText with an exact string fails on
// those — use substring matchers (`{ exact: false }`) for the split nodes.
//
// Wave B (cluster B3) per-screen UX adoption for the payout-method PICKER. This screen
// lists the saved methods (a static fixture const) + an "Add Methods" link + a back
// chevron; the add/edit FORM lives on /method/create (a different screen). So the
// foundations that fit are: a medium-impact haptic when a method option is selected
// (the card tap), and a hitSlop on the icon-only back chevron (<44px) so its tap target
// reaches 44px. The remaining describe block reads the screen source to assert a
// behavior/source signal for each. KeyboardAwareScreen (no inputs here), success/error
// haptics (no save/validation here), Toast (no save confirmation here), and
// Skeleton/RefreshControl (renders a static const, not async-fetched data) are
// intentionally NOT adopted on this screen — see the agent NOTEs.
const withdrawMethodSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerWithdrawMethodScreen.tsx"),
  "utf8",
);
describe("CustomerWithdrawMethodScreen (render)", () => {
  it("renders the heading and the add-methods control", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("My withdrawal methods")).toBeTruthy();
    expect(screen.getByText("Add Methods")).toBeTruthy();
  });

  it("renders both seeded payout methods' banks (text split by the ' · ' separator)", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("Kasikorn Bank", { exact: false })).toBeTruthy();
    expect(screen.getByText("Bangkok Bank", { exact: false })).toBeTruthy();
  });

  it("renders both masked account tails (nested <Text>)", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("****7890")).toBeTruthy();
    expect(screen.getByText("****3210")).toBeTruthy();
  });

  it("shows the account holder name on both methods", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getAllByText("Demo Shopper").length).toBe(2);
  });

  it("marks the default method with the [Default] badge", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    expect(screen.getByText("[Default]")).toBeTruthy();
  });

  it("mounts without throwing (AccountPageShell + safe-area stub resolve)", () => {
    expect(() => render(createElement(CustomerWithdrawMethodScreen))).not.toThrow();
  });
});

describe("CustomerWithdrawMethodScreen — dark mode method card surfaces (source signals)", () => {
  it("themes method card surfaces with pickThemed instead of light-only hex literals", () => {
    expect(withdrawMethodSource).toContain('pickThemed(colors, "#F6FDFB", colors.primarySoft)');
    expect(withdrawMethodSource).toContain('pickThemed(colors, "#D8EDE4", colors.border)');
    expect(withdrawMethodSource).toContain('pickThemed(colors, "#3D6B5C", colors.muted)');
    expect(withdrawMethodSource).toContain('pickThemed(colors, "#2D6A4F", colors.accentSoft)');
    expect(withdrawMethodSource).not.toMatch(/methodCard:[\s\S]*backgroundColor:\s*"#F6FDFB"/);
  });
});

describe("CustomerWithdrawMethodScreen — Wave B foundations adopted (source signals)", () => {
  it("imports haptics and fires a medium-impact cue when a method option is selected", () => {
    expect(withdrawMethodSource).toContain('from "@mobile/lib/haptics"');
    expect(withdrawMethodSource).toContain("haptics.impact(");
  });

  it("gives the icon-only back chevron (<44px) a hitSlop so the tap target reaches 44px", () => {
    expect(withdrawMethodSource).toContain("hitSlop=");
  });

  it("still renders the seeded payout methods after wiring the select-haptic (regression)", () => {
    render(createElement(CustomerWithdrawMethodScreen));
    // Two cards, each showing the holder name — proves the MotionPressable card tap
    // wiring did not break the list render.
    expect(screen.getAllByText("Demo Shopper").length).toBe(2);
  });
});
