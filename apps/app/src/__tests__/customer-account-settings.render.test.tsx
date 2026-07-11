import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

const clientPost = vi.fn();
vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: async () => ({ get: vi.fn(), post: clientPost }),
  resetSharedMobileApiClientForTests: () => {},
}));

const mockLogout = vi.fn().mockResolvedValue(undefined);
vi.mock("@mobile/auth/useMobileLogout", () => ({
  useMobileLogout: () => ({ logout: mockLogout, pending: false }),
}));

import { CustomerAccountSettingsScreen } from "@mobile/screens/CustomerAccountSettingsScreen";
import { ToastProvider } from "@mobile/components/Toast";
import { LocaleProvider } from "@mobile/i18n/LocaleProvider";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";

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
//     "Coming soon" placeholders. They render a real react-native Switch for web parity,
//     but each is permanently `disabled` with no state setter, so there is no setting
//     change to confirm.
//   - haptics.success (save): SKIPPED — the only save-like control is the subscription
//     button, which is permanently `disabled`.
//   - useToast: ADOPTED — the PDPA "Request data export / account deletion" actions confirm via toast.
//   - Skeleton + RefreshControl: SKIPPED — the screen renders a static fixture, not a
//     backend/fixture resource behind a loading state.
//   - hitSlop: SKIPPED — the only chevron is the back row, whose Pressable target is the
//     full 48px row (>= 44px), so its tap target already meets the minimum.
const settingsSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerAccountSettingsScreen.tsx"),
  "utf8"
);

// The screen now consumes useToast() (PDPA actions), so mount inside a ToastProvider — the same
// pattern the other useToast-backed screen render tests use.
const renderScreen = () =>
  render(
    createElement(
      ThemeProvider,
      {},
      createElement(
        LocaleProvider,
        {},
        createElement(ToastProvider, {}, createElement(CustomerAccountSettingsScreen))
      )
    )
  );

describe("CustomerAccountSettingsScreen (render)", () => {
  it("mounts without throwing", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders the subscription, notification, community, and PDPA data-rights sections", () => {
    renderScreen();
    // Section titles (the topbar title duplicates "Account Settings").
    expect(screen.getAllByText("Account Settings").length).toBeGreaterThan(0);
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("System default")).toBeTruthy();
    expect(screen.getByText("Light")).toBeTruthy();
    expect(screen.getByText("Dark")).toBeTruthy();
    expect(screen.getByText("Your Subscription")).toBeTruthy();
    expect(screen.getByText("Receive Notifications about Updates")).toBeTruthy();
    expect(screen.getByText("Join our Community")).toBeTruthy();
    // PDPA data rights (web parity): export + deletion actions.
    expect(screen.getByText("Request data export")).toBeTruthy();
    expect(screen.getByText("Request account deletion")).toBeTruthy();
  });

  it("renders both notification rows with the Coming soon pill", () => {
    renderScreen();
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
    // The rows render a disabled react-native Switch (web parity) and carry no onPress;
    // the only state is read-only (no setter is wired), confirming there is no setting change.
    expect(settingsSource).toContain("<Switch");
    expect(settingsSource).toContain("disabled");
    expect(settingsSource).not.toContain("setIsLineEnabled");
    expect(settingsSource).not.toContain("setIsEmailEnabled");
  });

  it("renders the disabled switches at reduced opacity so they READ as disabled", () => {
    // User report 2026-07-10: the coming-soon switches are functionally
    // disabled but rendered at full strength (dark mode even showed a live
    // mint on-track), inviting taps that do nothing. A dimmed control is the
    // platform convention for disabled.
    expect(settingsSource).toMatch(/switchDisabled:[\s\S]*?opacity: 0\.5/);
    expect(settingsSource).toMatch(/<Switch[\s\S]*?style=\{styles\.switchDisabled\}/);
  });

  it("uses the web LINE brand logo for the Line notification row (not a generic chat bubble)", () => {
    // Web parity: the Line row uses the ported LineAppIcon SVG, not the phosphor MessageCircle bubble.
    expect(settingsSource).toContain("LineAppIcon");
    expect(settingsSource).not.toContain("MessageCircle");
  });

  it("renders Join-our-Community cards as the web banner images (not flat color + text glyph)", () => {
    // Web parity: each card is the baked PNG banner from assets/account-settings-community/<id>.png.
    expect(settingsSource).toContain("account-settings-community/facebook.png");
    expect(settingsSource).toContain("communityBanners");
    expect(settingsSource).toContain("<Image");
    // The old flat-color + letter-glyph approach is gone.
    expect(settingsSource).not.toContain("communityBrandStyles");
    expect(settingsSource).not.toContain("communityGlyph");
  });

  // Country selector (2026-07-10): the screen lives at the /language route yet
  // carried no language or region UI — the only picker was the desktop header
  // globe. This section gives settings muscle-memory a home for both.
  describe("language & country section", () => {
    it("renders both languages and the active country", () => {
      globalThis.localStorage?.clear();
      renderScreen();

      expect(screen.getByText("Language & Country")).toBeTruthy();
      expect(screen.getByText("English")).toBeTruthy();
      expect(screen.getByText("ไทย")).toBeTruthy();
      expect(screen.getByLabelText("Change country").textContent).toContain("Thailand");
    });

    it("given a tap on ไทย > then the Thai locale persists", () => {
      globalThis.localStorage?.clear();
      renderScreen();

      fireEvent.click(screen.getByText("ไทย"));

      expect(globalThis.localStorage.getItem("gogocash.locale")).toBe("th");
    });

    it("given a country pick via the row > then the region sheet opens and the choice persists", () => {
      globalThis.localStorage?.clear();
      renderScreen();

      fireEvent.click(screen.getByLabelText("Change country"));
      fireEvent.click(screen.getByText("Singapore"));

      expect(globalThis.localStorage.getItem("gogocash.region")).toBe("SG");
      expect(screen.getByLabelText("Change country").textContent).toContain("Singapore");
    });
  });
});

// Google Play launch blocker (2026-07-11): the deletion button was a no-op
// toast. Founder-decided semantics: 30-day soft delete via the real backend.
describe("account deletion (Play policy)", () => {
  it("given a single tap > then it arms a confirm step and fires no request", async () => {
    clientPost.mockClear();
    renderScreen();

    fireEvent.click(screen.getByText("Request account deletion"));

    expect(await screen.findByText("Tap again to permanently delete")).toBeTruthy();
    expect(clientPost).not.toHaveBeenCalled();
  });

  it("given tap + confirm > then POSTs /user/account-deletion and signs out", async () => {
    clientPost.mockClear();
    mockLogout.mockClear();
    clientPost.mockResolvedValue({ deletionScheduledFor: "2026-08-10T00:00:00.000Z" });
    renderScreen();

    fireEvent.click(screen.getByText("Request account deletion"));
    fireEvent.click(await screen.findByText("Tap again to permanently delete"));

    expect(await screen.findByText(/Deletion scheduled/)).toBeTruthy();
    expect(clientPost).toHaveBeenCalledWith("/user/account-deletion");
    expect(mockLogout).toHaveBeenCalled();
  });

  it("given the backend rejects > then shows the shared error toast and stays signed in", async () => {
    clientPost.mockClear();
    mockLogout.mockClear();
    clientPost.mockRejectedValue(new Error("boom"));
    renderScreen();

    fireEvent.click(screen.getByText("Request account deletion"));
    fireEvent.click(await screen.findByText("Tap again to permanently delete"));

    expect(await screen.findByText("Could not complete your request. Please try again.")).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it("public deletion URL > given Play's Data safety form > then the /account-deletion route exists", () => {
    const route = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../app/account-deletion.tsx"),
      "utf8"
    );
    expect(route).toContain("account");
    expect(settingsSource).not.toContain("this build has no backend wired here");
  });
});
