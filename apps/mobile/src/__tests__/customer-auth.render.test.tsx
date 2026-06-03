import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerDesktopHeader -> CustomerLocaleRegionControl -> i18n/LocaleProvider pulls in
// expo-localization (-> expo-modules-core), which reaches for the native `expo` global
// that does not exist under happy-dom (`__DEV__ is not defined`). Device locale is not
// the behavior under test, so mock the module at the seam — the same pattern the
// locale-hydration render test uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";

// Wave B (B1) per-screen UX adoption for the phone + OTP sign-in screen. This is the
// RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom) to
// prove the form still renders after wrapping, AND reads the screen source to assert a
// behavior/source signal for each applied Wave A foundation (KeyboardAwareScreen,
// haptics on the OTP/sign-in path, hitSlop on small icon/text-only buttons, and a
// useReducedMotion gate on the screen-local Animated timelines). Skeleton/RefreshControl
// are intentionally NOT adopted here — this is a form screen, not a data list.
const authSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerAuthScreen.tsx"),
  "utf8"
);

describe("CustomerAuthScreen (render)", () => {
  it("mounts the login form without throwing", () => {
    expect(() => render(createElement(CustomerAuthScreen, { mode: "login" }))).not.toThrow();
    // Title appears as the brand heading + the primary action label.
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
  });

  it("mounts the register form without throwing", () => {
    expect(() => render(createElement(CustomerAuthScreen, { mode: "register" }))).not.toThrow();
    expect(screen.getAllByText("Sign up").length).toBeGreaterThan(0);
  });

  it("renders the phone field so the keyboard-avoidance wrapper has a focusable target", () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));
    // webAuthPage.phonePlaceholder is the phone TextInput's accessibilityLabel + placeholder.
    expect(screen.getAllByPlaceholderText("Phone Number").length).toBeGreaterThan(0);
  });
});

describe("CustomerAuthScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(authSource).toContain('from "@mobile/components/KeyboardAwareScreen"');
    expect(authSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on verified OTP sign-in + error on an invalid code", () => {
    expect(authSource).toContain('from "@mobile/lib/haptics"');
    expect(authSource).toContain("haptics.success(");
    expect(authSource).toContain("haptics.error(");
  });

  it("gates the screen-local Animated timelines behind useReducedMotion", () => {
    expect(authSource).toContain('from "@mobile/hooks/useReducedMotion"');
    expect(authSource).toContain("useReducedMotion(");
  });

  it("gives the text-only resend + change-number buttons a hitSlop so the tap target reaches 44px", () => {
    // Both are text-only MotionPressables shorter than 44px; hitSlop expands the tappable area.
    const hitSlopCount = (authSource.match(/hitSlop=\{/g) ?? []).length;
    expect(hitSlopCount).toBeGreaterThanOrEqual(2);
  });
});
