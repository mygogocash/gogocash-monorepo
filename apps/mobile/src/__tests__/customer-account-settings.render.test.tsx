import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerAccountSettingsScreen renders through AccountPageShell ->
// CustomerDesktopHeader -> CustomerLocaleRegionControl -> i18n/LocaleProvider, which
// reaches expo-localization (-> expo-modules-core) and the native `expo` global that
// does not exist under happy-dom (`__DEV__ is not defined`). Device locale is not
// under test, so mock the module at the seam — the same pattern the other screen
// render tests use.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerAccountSettingsScreen } from "@mobile/screens/CustomerAccountSettingsScreen";

// Wave B (B2) per-screen UX pass for the account-settings screen. RENDER suite: it
// MOUNTS the screen (react-native -> react-native-web, happy-dom) to prove it still
// renders, which is the meaningful regression guard here.
//
// This is the rare screen where NO Wave A foundation has an adoption point, and the
// test documents why with a source-signal check that the screen stayed dependency-free
// of the interaction primitives (so a future reviewer sees the skip was deliberate,
// not forgotten):
//   - KeyboardAwareScreen: SKIPPED — there is no TextInput on the screen.
//   - haptics.impact (setting change): SKIPPED — the Line/Email toggles are display-only
//     "Coming soon" placeholders (no onPress, no state setter), so there is no setting
//     change to confirm.
//   - haptics.success (save): SKIPPED — the only save-like control is the subscription
//     button, which is permanently `disabled`.
//   - useToast (copy/save): SKIPPED — the screen has no copy or save action.
//   - Skeleton + RefreshControl: SKIPPED — the screen renders a static fixture, not a
//     backend/fixture resource behind a loading state.
//   - hitSlop: SKIPPED — the only chevron is the back row, whose Pressable target is the
//     full 48px row (>= 44px), so its tap target already meets the minimum.
const settingsSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerAccountSettingsScreen.tsx"),
  "utf8"
);

describe("CustomerAccountSettingsScreen (render)", () => {
  it("mounts without throwing", () => {
    expect(() => render(createElement(CustomerAccountSettingsScreen))).not.toThrow();
  });

  it("renders the subscription, notification, and community sections", () => {
    render(createElement(CustomerAccountSettingsScreen));
    // Section titles (the topbar title duplicates "Account Settings").
    expect(screen.getAllByText("Account Settings").length).toBeGreaterThan(0);
    expect(screen.getByText("Your Subscription")).toBeTruthy();
    expect(screen.getByText("Receive Notifications about Updates")).toBeTruthy();
    expect(screen.getByText("Join our Community")).toBeTruthy();
  });

  it("renders both notification rows with the Coming soon pill", () => {
    render(createElement(CustomerAccountSettingsScreen));
    expect(screen.getByText("Notifications via Line")).toBeTruthy();
    expect(screen.getByText("Notifications via Email")).toBeTruthy();
    expect(screen.getAllByText("Coming soon").length).toBe(2);
  });
});

describe("CustomerAccountSettingsScreen — Wave B foundations deliberately not applicable (source signals)", () => {
  it("has no TextInput, so KeyboardAwareScreen is correctly not adopted", () => {
    expect(settingsSource).not.toContain("TextInput");
    expect(settingsSource).not.toContain("KeyboardAwareScreen");
  });

  it("keeps the toggles display-only — no interactive setting-change handler exists to hook a haptic onto", () => {
    // TogglePill is a presentational View and the rows carry no onPress; the only
    // state is read-only (no setter is wired), confirming there is no setting change.
    expect(settingsSource).toContain("function TogglePill");
    expect(settingsSource).not.toContain("setIsLineEnabled");
    expect(settingsSource).not.toContain("setIsEmailEnabled");
  });
});
