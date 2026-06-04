import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

// Wave 3: /profile is now responsive — the rich ProfileInfoPanel renders on desktop
// (useWindowDimensions().width >= mobileShellLayout.desktopBreakpoint, =1024), the hub
// otherwise. Both CustomerProfileScreen AND AccountPageShell read useWindowDimensions,
// so to drive the desktop branch deterministically we mock that ONE react-native export
// (keeping every other export real -> react-native-web), then mutate `viewport.width`
// per-test. Defaults to a mobile width so the existing hub tests are unaffected.
const viewport = { width: 375, height: 812, scale: 2, fontScale: 1 };
vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    useWindowDimensions: () => viewport,
  };
});

import { ToastProvider } from "@mobile/components/Toast";
// Imported AFTER the react-native mock is registered (vi.mock is hoisted, so this
// dynamic import still sees the mocked useWindowDimensions).
const { CustomerProfileScreen } = await import("@mobile/screens/CustomerProfileScreen");

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

// Each test starts at the mobile width so the responsive branch is deterministic and
// the desktop test cannot leak its 1440 width into the hub tests.
beforeEach(() => {
  viewport.width = 375;
});

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

describe("CustomerProfileScreen — responsive desktop panel (render)", () => {
  it("renders the rich ProfileInfoPanel cashback breakdown rows at desktop width (>= 1024)", () => {
    // Drive the desktop branch: width 1440 >= mobileShellLayout.desktopBreakpoint (1024),
    // so CustomerProfileScreen mounts <ProfileInfoPanel> instead of the account hub. The
    // panel's cashback card renders the BALANCE BREAKDOWN rows from webProfileInfoCashbackCard.
    // (useCopy is stubbed to a passthrough in the render harness, so labels render verbatim.)
    viewport.width = 1440;
    renderScreen();

    expect(screen.getByText("Linked My Cashback")).toBeTruthy();
    expect(screen.getByText("GoGoCash balance")).toBeTruthy();
  });

  it("renders the hub (not the desktop panel) at mobile width", () => {
    // Counterpart guard: at the default mobile width the hub renders and the desktop-only
    // breakdown rows are absent — proving the branch is width-driven, not always-on.
    viewport.width = 375;
    renderScreen();

    expect(screen.getByText("Invite your Friends")).toBeTruthy();
    expect(screen.queryByText("Linked My Cashback")).toBeNull();
  });
});
