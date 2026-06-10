import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerWalletScreen pulls in AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider, which reaches expo-localization
// (-> expo-modules-core) and the native `expo` global that does not exist under
// happy-dom (`__DEV__ is not defined`). Device locale is not under test, so mock the
// module at the seam — the same pattern customer-auth/customer-profile render tests use.
// (No @mobile/observability mock needed: the wallet screen does not import Sentry.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerWalletScreen } from "@mobile/screens/CustomerWalletScreen";

// Wave B (B3) per-screen UX adoption for the cashback WALLET dashboard. RENDER suite:
// it MOUNTS the screen (react-native -> react-native-web, happy-dom) to prove the
// dashboard still renders after the additive changes, AND reads the screen source to
// assert a behavior/source signal for each applied Wave A foundation. Applied here:
// pull-to-refresh (RefreshControl on the transactions list, wired to the resource
// refetch) + a hitSlop on the sub-44px back chevron + WalletSkeleton on the loading
// state. The non-ready guard delegates to the shared CustomerAccountResourceState,
// which now accepts an opt-in `loadingSkeleton` prop (central B3 enhancement) — the
// wallet passes <WalletSkeleton /> so loading shows a content-shaped placeholder
// instead of the generic spinner. KeyboardAwareScreen is skipped: no text inputs.
const walletSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerWalletScreen.tsx"),
  "utf8"
);

// Mount inside QueryClientProvider: useCustomerAccountResource calls useQuery
// unconditionally (same as the profile/offers screens). The default account data
// source is "fixtures", so the resource resolves to status "ready" and the screen
// renders its dashboard (with the RefreshControl-bearing transactions list) rather
// than delegating to the shared resource state.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerWalletScreen)
    )
  );
}

describe("CustomerWalletScreen (render)", () => {
  it("mounts the wallet dashboard without throwing inside a QueryClientProvider", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders the cashback summary header + the transactions area", () => {
    renderScreen();
    // The screen header title appears (WalletHeader + AccountPageShell title both use it).
    expect(screen.getAllByText("My Wallet").length).toBeGreaterThan(0);
    // The transactions area now mounts with mock rows on the default "All" tab — a row brand
    // proves it mounted (the empty-state copy still lives in source for the filtered-to-zero case).
    expect(screen.getByText("Glow Theory")).toBeTruthy();
  });

  it("tabs are functional: switching to Earning filters out withdraw rows", () => {
    renderScreen();
    // All tab at mount shows a withdraw row.
    expect(screen.getByText("Withdraw to PromptPay")).toBeTruthy();
    // Activate the Earning tab → withdraw rows are filtered out, earn rows remain.
    fireEvent.click(screen.getByText("Earning Transactions"));
    expect(screen.queryByText("Withdraw to PromptPay")).toBeNull();
    expect(screen.getByText("Glow Theory")).toBeTruthy();
    // Switch to Withdraw → only withdraw rows; the earn row is gone.
    fireEvent.click(screen.getByText("Withdraw Transactions"));
    expect(screen.getByText("Withdraw to PromptPay")).toBeTruthy();
    expect(screen.queryByText("Glow Theory")).toBeNull();
  });

  it("search filters the rows by substring", () => {
    renderScreen();
    expect(screen.getByText("Glow Theory")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Bloom" } });
    expect(screen.getByText("Bloom & Beam")).toBeTruthy();
    expect(screen.queryByText("Glow Theory")).toBeNull();
  });

  it("status filter dropdown: opening it and picking a status filters the rows", () => {
    renderScreen();
    // A pending row is visible on All.
    expect(screen.getByText("Orbit Airways")).toBeTruthy();
    // Open the Status dropdown, then choose "Success" from the menu options.
    fireEvent.click(screen.getByText("Status"));
    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    // Pending rows drop; success rows remain.
    expect(screen.getByText("Glow Theory")).toBeTruthy();
    expect(screen.queryByText("Orbit Airways")).toBeNull();
  });

  it("date range dropdown: opening it and picking a window filters the rows", () => {
    renderScreen();
    // Quick Cart is the oldest row (Jan 28) — visible on All time.
    expect(screen.getByText("Quick Cart")).toBeTruthy();
    // Open the Date Range dropdown, then choose "Last 7 days".
    fireEvent.click(screen.getByText("Date Range"));
    fireEvent.click(screen.getByRole("button", { name: "Last 7 days" }));
    // The newest row stays; the oldest drops out of the 7-day window.
    expect(screen.getByText("Glow Theory")).toBeTruthy();
    expect(screen.queryByText("Quick Cart")).toBeNull();
  });

  it("shows the empty state when filters match no rows", () => {
    renderScreen();
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "zzz-no-match" } });
    expect(screen.queryByText("Glow Theory")).toBeNull();
    expect(screen.getByText("It's been a while since your last wallet visit.")).toBeTruthy();
  });
});

describe("CustomerWalletScreen — Wave B foundations adopted (source signals)", () => {
  it("adds pull-to-refresh (RefreshControl) wired to the resource refetch", () => {
    // RefreshControl comes from react-native (aliased to react-native-web in the
    // render harness). The affordance must be mounted on the transactions list and
    // its onRefresh wired to the existing resource refetch (walletResource.retry).
    expect(walletSource).toContain("RefreshControl");
    expect(walletSource).toContain("<RefreshControl");
    expect(walletSource).toContain("onRefresh=");
    expect(walletSource).toContain(".retry");
    // Reuse the existing catalog string (key walletTransactionsLoading -> Thai
    // "กำลังโหลดธุรกรรม…") for the refresh affordance label so Thai resolves via
    // reverse-lookup — no new mobile-only copy is invented here.
    expect(walletSource).toContain('tc("Loading transactions…")');
  });

  it("gives the icon-only back chevron a hitSlop so the tap target reaches 44px", () => {
    // The back-chevron MotionPressable is only 34x40px (styles.backButton);
    // hitSlop expands the tappable area to a comfortable >=44px touch target.
    expect(walletSource).toContain("hitSlop=");
  });

  it("passes WalletSkeleton to the shared resource state's opt-in loadingSkeleton", () => {
    // The status !== "ready" guard still delegates to CustomerAccountResourceState (owned
    // centrally), but that shared component now accepts an opt-in loadingSkeleton prop (B3
    // enhancement). The wallet hands it <WalletSkeleton /> so the loading state renders a
    // content-shaped placeholder instead of the generic spinner — finding #2, now real.
    expect(walletSource).toContain("CustomerAccountResourceState");
    expect(walletSource).toContain('walletResource.status !== "ready"');
    expect(walletSource).toContain("WalletSkeleton");
    expect(walletSource).toContain("loadingSkeleton={<WalletSkeleton");
  });

  it("has state-driven transaction tabs + mock rows (all cases) + working Search/Status/Date filters", () => {
    // Tabs switch via state (not hardcoded index 0) and filter the mock rows by kind.
    expect(walletSource).toContain("setActiveTab");
    expect(walletSource).not.toContain("index === 0 ? styles.tabButtonActive");
    expect(walletSource).toContain("WALLET_TX_ROWS");
    // Mock covers earning + withdraw × success / pending / failed.
    expect(walletSource).toContain('kind: "withdraw"');
    expect(walletSource).toContain('status: "pending"');
    expect(walletSource).toContain('status: "failed"');
    // Working Search (TextInput) + Status + Date Range filters.
    expect(walletSource).toContain("TextInput");
    expect(walletSource).toContain("setSearch");
    expect(walletSource).toContain("setStatusFilter");
    expect(walletSource).toContain("setDateDays");
    // Tab focus ring suppressed (web parity: outline-none).
    expect(walletSource).toContain('outlineColor: "transparent"');
    // Empty-state copy stays in source for the filtered-to-zero case.
    expect(walletSource).toContain("webWalletEmptyState.title");
  });
});
