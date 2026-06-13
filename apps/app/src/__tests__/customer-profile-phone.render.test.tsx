import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerProfilePhoneScreen -> AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider pulls in expo-localization
// (-> expo-modules-core), which reaches for the native `expo` global that does
// not exist under happy-dom (`__DEV__ is not defined`). Device locale is not the
// behavior under test, so mock the module at the seam — the same pattern the
// customer-auth render test uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerProfilePhoneScreen } from "@mobile/screens/CustomerProfilePhoneScreen";

// Wave B (B2 — Profile & account hub) per-screen UX adoption for the phone-change
// FORM (current mobile number entry + OTP verify). This is the RENDER suite: it
// MOUNTS both screen modes (react-native -> react-native-web, happy-dom) to prove
// the forms still render after wrapping, AND reads the screen source to assert a
// behavior/source signal for each applied Wave A foundation:
//   - KeyboardAwareScreen wraps the inputs so the soft keyboard never covers the
//     focused field (the main fix for a form screen),
//   - haptics fire on the verify/submit path (success when the input is complete,
//     error on an invalid number / incomplete code),
//   - hitSlop expands the small text-only Back buttons + the chevron link toward
//     the 44px tap target.
// Skeleton / RefreshControl are intentionally NOT adopted here — this is a form,
// not a data list. useReducedMotion is also out of scope: this screen has no
// Animated timelines / MotionPressable to gate (unlike B1's OTP-cell animation).
const phoneSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerProfilePhoneScreen.tsx"),
  "utf8"
);

describe("CustomerProfilePhoneScreen (render)", () => {
  it("mounts the phone-number form without throwing", () => {
    expect(() => render(createElement(CustomerProfilePhoneScreen, { mode: "phone" }))).not.toThrow();
    expect(screen.getAllByText("Change Your Phone Number").length).toBeGreaterThan(0);
  });

  it("mounts the OTP verify form without throwing", () => {
    expect(() => render(createElement(CustomerProfilePhoneScreen, { mode: "otp" }))).not.toThrow();
    expect(screen.getAllByText("Verification Code").length).toBeGreaterThan(0);
  });

  it("renders the mobile-number field so the keyboard-avoidance wrapper has a focusable target", () => {
    render(createElement(CustomerProfilePhoneScreen, { mode: "phone" }));
    // The phone TextInput's placeholder doubles as a focus target for the keyboard.
    expect(screen.getAllByPlaceholderText("08x xxx xxxx").length).toBeGreaterThan(0);
  });

  it("renders the OTP code field as the focusable target for the verify step", () => {
    render(createElement(CustomerProfilePhoneScreen, { mode: "otp" }));
    expect(screen.getAllByPlaceholderText("000000").length).toBeGreaterThan(0);
  });
});

describe("CustomerProfilePhoneScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(phoneSource).toContain('from "@mobile/components/KeyboardAwareScreen"');
    expect(phoneSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a complete submit + error on an invalid number/code", () => {
    expect(phoneSource).toContain('from "@mobile/lib/haptics"');
    expect(phoneSource).toContain("haptics.success(");
    expect(phoneSource).toContain("haptics.error(");
  });

  it("gives the small icon/text-only buttons a hitSlop so the tap target reaches ~44px", () => {
    // The chevron back-link (icon-only) plus the two text-only "Back" buttons are
    // shorter than 44px; hitSlop expands the tappable area.
    const hitSlopCount = (phoneSource.match(/hitSlop=\{/g) ?? []).length;
    expect(hitSlopCount).toBeGreaterThanOrEqual(2);
  });
});
