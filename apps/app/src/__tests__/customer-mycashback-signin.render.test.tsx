import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The screen renders CustomerDesktopHeader -> CustomerLocaleRegionControl ->
// LocaleProvider, which imports expo-localization. expo-localization pulls in
// expo-modules-core, which reaches for the native `expo`/`__DEV__` globals that
// do not exist under happy-dom. Device locale detection is not the behavior
// under test here, so mock the third-party module at the seam (same pattern as
// locale-hydration.render.test.tsx).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerMyCashbackSignInScreen } from "@mobile/screens/CustomerMyCashbackSignInScreen";

// Wave B (B1) UX-adoption coverage for the MyCashback link/sign-in FORM screen.
// Unlike the source-string parity suite this MOUNTS the screen (react-native ->
// react-native-web, happy-dom) and asserts the Wave A foundations were adopted:
//  - KeyboardAwareScreen wraps the credential/OTP inputs so the soft keyboard
//    never covers the focused field (the main fix for this screen).
//  - haptics.success() fires on a correct OTP (link succeeds), haptics.error()
//    on a wrong OTP — verified via a source assertion (the haptics module is a
//    fire-and-forget side effect with no rendered output to query).
// Skeleton / RefreshControl are intentionally NOT applied: this is a form, not a
// data-backed list.

const src = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMyCashbackSignInScreen.tsx"),
  "utf8"
);

describe("CustomerMyCashbackSignInScreen (render)", () => {
  it("mounts the method step without throwing", () => {
    expect(() => render(createElement(CustomerMyCashbackSignInScreen))).not.toThrow();
  });

  it("renders the real method-step copy and the phone/email radio + Next control", () => {
    render(createElement(CustomerMyCashbackSignInScreen));
    expect(screen.getByText("Select Your Preferred Linking Method")).toBeTruthy();
    expect(screen.getByText("Phone Number")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
  });
});

describe("CustomerMyCashbackSignInScreen — Wave A adoption (source)", () => {
  it("wraps the input area in KeyboardAwareScreen", () => {
    expect(src).toContain("KeyboardAwareScreen");
    expect(src).toContain('from "@mobile/components/KeyboardAwareScreen"');
  });

  it("fires haptics.success() on a successful link and haptics.error() on a failed code", () => {
    expect(src).toContain('from "@mobile/lib/haptics"');
    expect(src).toContain("haptics.success(");
    expect(src).toContain("haptics.error(");
  });

  it("themes the linking form for dark mode (field surfaces, muted placeholders, themed hero band)", () => {
    expect(src).toContain("isDesktop ? colors.card : colors.background");
    expect(src).toContain("placeholderTextColor={colors.muted}");
    expect(src).toContain("backgroundColor: colors.field");
    expect(src).toContain('pickThemed(colors, colors.primaryDark, colors.link)');
    expect(src).toContain('pickThemed(colors, "#ECECEC", colors.fieldMuted)');
  });
});
