import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The screen renders CustomerDesktopHeader -> CustomerLocaleRegionControl ->
// LocaleProvider, which imports expo-localization. expo-localization pulls in
// expo-modules-core, which reaches for the native `expo`/`__DEV__` globals that
// do not exist under happy-dom. Device locale detection is not under test, so
// mock the third-party module at the seam (same pattern as
// locale-hydration.render.test.tsx).
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerLinkCashbackScreen } from "@mobile/screens/CustomerLinkCashbackScreen";

// Wave B (B1) coverage for the MyCashback link/sign-in INTRO screen. This is a
// pure landing surface: a logo, connector graphic, and two NAVIGATION buttons
// (Skip -> /method/create, Link Account -> the sign-in form). It has no
// TextInput, no submit handler, and no success/failure event — so the Wave A
// foundations (KeyboardAwareScreen, haptics) do not apply here; they live on the
// sibling form screen (CustomerMyCashbackSignInScreen). hitSlop is not needed
// either: both actions are full-width buttons >= 44px, not icon-only controls.
// This test asserts the screen mounts in both modes and renders its real copy,
// and documents (source) the no-input shape that justifies the skips.

const src = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerLinkCashbackScreen.tsx"),
  "utf8"
);

describe("CustomerLinkCashbackScreen (render)", () => {
  it("mounts in link mode without throwing", () => {
    expect(() =>
      render(createElement(CustomerLinkCashbackScreen, { mode: "link" }))
    ).not.toThrow();
  });

  it("mounts in signIn mode without throwing", () => {
    expect(() =>
      render(createElement(CustomerLinkCashbackScreen, { mode: "signIn" }))
    ).not.toThrow();
  });

  it("renders the real intro copy and both navigation actions", () => {
    render(createElement(CustomerLinkCashbackScreen, { mode: "link" }));
    expect(screen.getByText("Sign in")).toBeTruthy();
    expect(screen.getByText("Link MyCashback with GoGoCash")).toBeTruthy();
    // "Skip" and "Link Account" each appear as a Pressable label.
    expect(screen.getAllByText("Skip").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Link Account").length).toBeGreaterThan(0);
  });
});

describe("CustomerLinkCashbackScreen — no-input intro (source)", () => {
  it("has no TextInput (justifies skipping KeyboardAwareScreen and submit haptics)", () => {
    expect(src).not.toContain("TextInput");
  });
});
