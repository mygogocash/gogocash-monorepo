import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerProfileScreen pulls in AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider, which reaches expo-localization
// (-> expo-modules-core) and the native `expo` global that does not exist under
// happy-dom (`__DEV__ is not defined`). Device locale is not under test, so mock the
// module at the seam — the same pattern customer-auth.render.test.tsx uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

// CustomerProfileScreen imports resetObservabilityIdentity from
// @mobile/observability/client, which statically imports @sentry/react-native ->
// the real (Flow-typed) react-native that the render harness aliases away
// everywhere EXCEPT this un-aliased Sentry path (`Cannot find module .../promise/
// setimmediate/es6-extensions`). Observability is not under test and the identity
// reset only runs inside the confirmed-logout handler (never on a render mount), so
// stub the module at the seam — mirroring the expo-localization mock above.
vi.mock("@mobile/observability/client", () => ({
  resetObservabilityIdentity: vi.fn(),
}));

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerProfileScreen } from "@mobile/screens/CustomerProfileScreen";

// Wave B (B2) per-screen UX adoption for the account-hub screen. RENDER suite: it
// MOUNTS the screen (react-native -> react-native-web, happy-dom) to prove the hub
// still renders after the additive changes, AND reads the screen source to assert a
// behavior/source signal for each applied Wave A foundation (haptics.success on the
// confirmed logout, a useToast copy confirmation reusing an existing translated
// string, and a hitSlop on the sub-44px Copy-Link button). KeyboardAwareScreen and
// Skeleton/RefreshControl are intentionally NOT adopted here — the hub has no text
// inputs, and its loading state is already delegated to the shared
// CustomerAccountResourceState rather than an in-screen pull-to-refresh list.
const profileSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerProfileScreen.tsx"),
  "utf8"
);

// Mount inside QueryClientProvider (useCustomerAccountResource calls useQuery
// unconditionally — same as the offers screen) and the real ToastProvider (the
// copy affordance calls useToast().show, which throws without a provider). Both
// are the providers AppProviders supplies in the real app.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ToastProvider, {}, createElement(CustomerProfileScreen))
    )
  );
}

describe("CustomerProfileScreen (render)", () => {
  it("mounts the account hub without throwing inside a QueryClientProvider", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders the profile hub rows + logout affordance", () => {
    renderScreen();
    // Log Out appears as the row label + the accessibilityLabel on the same control.
    expect(screen.getAllByText("Log Out").length).toBeGreaterThan(0);
    expect(screen.getByText("Invite your Friends")).toBeTruthy();
    expect(screen.getByText("Copy Link")).toBeTruthy();
  });
});

describe("CustomerProfileScreen — Wave B foundations adopted (source signals)", () => {
  it("fires a success haptic on the confirmed logout", () => {
    expect(profileSource).toContain('from "@mobile/lib/haptics"');
    expect(profileSource).toContain("haptics.success(");
  });

  it("shows a toast confirmation on copy, reusing an existing translated string", () => {
    expect(profileSource).toContain('from "@mobile/hooks/useToast"');
    expect(profileSource).toContain("useToast(");
    expect(profileSource).toContain(".show(");
    // Reuse the existing catalog string (key walletTransactionsCopied) so Thai
    // resolves via reverse-lookup — no new mobile-only copy is invented here.
    expect(profileSource).toContain('tc("Copied to clipboard")');
  });

  it("gives the sub-44px Copy-Link button a hitSlop so the tap target reaches 44px", () => {
    // The Copy Link MotionPressable is only 24px tall (styles.copyButton height: 24);
    // hitSlop expands the tappable area to a comfortable touch target.
    expect(profileSource).toContain("hitSlop=");
  });
});
