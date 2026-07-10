import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerShopDetailScreen reaches i18n/LocaleProvider (via useCopy/AccountPageShell-free
// path it still uses tc()), which touches expo-localization (-> expo-modules-core) and the
// native `expo` global that does not exist under happy-dom. Device locale is not under test,
// so mock the module at the seam — the same pattern the wallet/auth/profile render tests use.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const merchantResourceState = vi.hoisted(() => ({
  data: null as unknown,
  status: "ready" as const,
  source: "fixtures" as "fixtures" | "backend",
}));

vi.mock("@mobile/account/customerAccountResource", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mobile/account/customerAccountResource")>();
  return {
    ...actual,
    useCustomerAccountResource: (options: { resourceId: string; fixtureData: unknown }) => {
      if (options.resourceId === "merchant") {
        return {
          data: merchantResourceState.data ?? options.fixtureData,
          endpoint: "/offer/test",
          error: null,
          retry: vi.fn(),
          source: merchantResourceState.source,
          status: merchantResourceState.status,
        };
      }
      if (options.resourceId === "policyCategory") {
        return {
          data: options.fixtureData,
          endpoint: "/policy/test",
          error: null,
          retry: vi.fn(),
          source: merchantResourceState.source,
          status: "ready" as const,
        };
      }
      if (options.resourceId === "brandCatalog") {
        return {
          data: options.fixtureData,
          endpoint: "/offer/catalog",
          error: null,
          retry: vi.fn(),
          source: merchantResourceState.source,
          status: "ready" as const,
        };
      }
      return {
        data: options.fixtureData,
        endpoint: "/fixture",
        error: null,
        retry: vi.fn(),
        source: merchantResourceState.source,
        status: "ready" as const,
      };
    },
  };
});

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerShopDetailScreen } from "@mobile/screens/CustomerShopDetailScreen";

// Wave B (B4 — discovery cluster) per-screen UX adoption for the merchant/SHOP DETAIL
// screen. RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom)
// to prove the page still renders after the additive changes, AND reads the screen source
// to assert a behavior/source signal for each applied Wave A foundation.
//
// Unlike the home/discovery/category screens (which the B4 NOTE flagged as backed by
// SYNCHRONOUS in-memory parity consts — no resource, so skeleton/real-refresh didn't apply),
// THIS screen is backed by useCustomerAccountResource — an ASYNC resource with a real
// `/offer/${merchantId}` backend endpoint + a `retry` refetch, exactly like the sibling B3
// wallet screen. So pull-to-refresh + a loading skeleton DO apply here and are adopted,
// mirroring CustomerWalletScreen:
//   - RefreshControl on the main ScrollView, wired to merchantResource.retry.
//   - loadingSkeleton passed to the shared CustomerAccountResourceState guard.
// Plus screen-local fixes: a toast + success haptic on the referral "Share" action
// (REUSING the existing translated "Copied to clipboard" string -> walletTransactionsCopied
// catalog key -> Thai, so no new copy), a hitSlop on the sub-44px icon+text share button,
// and numberOfLines Thai-truncation guards on overflow-prone titles.
// KeyboardAwareScreen is skipped: the screen has no text inputs.
const shopSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerShopDetailScreen.tsx"),
  "utf8"
);

// Mount inside QueryClientProvider (useCustomerAccountResource calls useQuery
// unconditionally; default account data source is "fixtures" so the resource resolves to
// "ready" and the screen renders its content) AND ToastProvider (the referral Share action
// consumes useToast(), which throws without a provider — same as the offers render test).
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ToastProvider, {}, createElement(CustomerShopDetailScreen, {}))
    )
  );
}

describe("CustomerShopDetailScreen (render)", () => {
  it("mounts the shop detail page without throwing inside the providers", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders core merchant content (brand, cashback, tracking, referral)", () => {
    renderScreen();
    // Brand appears in the hero summary card.
    expect(screen.getAllByText("Grocery Galaxy").length).toBeGreaterThan(0);
    // A few stable section strings prove the body mounted.
    expect(screen.getByText("Cashback Tracking Period")).toBeTruthy();
    expect(screen.getByText("10% Cashback Bonus")).toBeTruthy();
  });

  it("renders live-mapped brand name in the hero summary card", () => {
    merchantResourceState.data = {
      _id: "6a49f3e6ce2e0da81d6dc375",
      offer_name: "Shopee Affiliate Program",
      offer_name_display: "Shopee",
      categories: "Marketplace",
      commissions: [{ Commission: "2.02%" }],
      logo: "https://media-staging.gogocash.co/brands/shopee-logo.png",
      tracking_link: "https://tracking.example/shopee",
    };
    merchantResourceState.source = "backend";

    renderScreen();

    expect(screen.getAllByText("Shopee").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.02%").length).toBeGreaterThan(0);
    expect(screen.getByTestId("shop-detail-brand-name")).toBeTruthy();
    // The logo circle is desktop-only since 2026-07-10 — on the mobile layout
    // this test renders, the banner above the pill carries the brand instead.
    expect(screen.queryByTestId("shop-detail-brand-logo")).toBeNull();
    expect(screen.queryByTestId("shop-detail-brand-logo-fallback")).toBeNull();
    expect(screen.queryByText("Grocery Galaxy")).toBeNull();
  });
});

describe("CustomerShopDetailScreen — Wave B foundations adopted (source signals)", () => {
  it("imports useToast and shows a confirmation toast on the referral share action", () => {
    expect(shopSource).toContain('from "@mobile/hooks/useToast"');
    expect(shopSource).toContain("useToast(");
    expect(shopSource).toContain(".show(");
  });

  it("reuses the existing translated 'Copied to clipboard' string for the toast (no new copy)", () => {
    // tc("Copied to clipboard") reverse-looks-up the walletTransactionsCopied catalog key,
    // which already has a Thai translation ("คัดลอกแล้ว") — so the toast localizes without
    // introducing a new mobile-only string.
    expect(shopSource).toContain('tc("Copied to clipboard")');
  });

  it("imports haptics and fires success feedback on the share action", () => {
    expect(shopSource).toContain('from "@mobile/lib/haptics"');
    expect(shopSource).toContain("haptics.success(");
  });

  it("adds pull-to-refresh (RefreshControl) wired to the merchant resource refetch", () => {
    // The screen IS backed by an async resource (useCustomerAccountResource -> /offer/{id})
    // with a retry refetch — same shape as the wallet screen — so the refresh affordance
    // applies (it does NOT apply to the synchronous-const home/discovery/category screens).
    expect(shopSource).toContain("RefreshControl");
    expect(shopSource).toContain("<RefreshControl");
    expect(shopSource).toContain("onRefresh=");
    expect(shopSource).toContain("merchantResource.retry");
  });

  it("passes a loading skeleton to the shared resource-state guard", () => {
    // The status !== "ready" guard delegates to CustomerAccountResourceState (owned
    // centrally), which accepts an opt-in loadingSkeleton prop (Wave A/B3 enhancement).
    // The shop hands it a content-shaped placeholder so the loading state shows a skeleton
    // instead of the generic spinner.
    expect(shopSource).toContain('merchantResource.status !== "ready"');
    expect(shopSource).toContain("loadingSkeleton=");
  });

  it("gives the sub-44px icon+text share button a hitSlop so the tap target reaches 44px", () => {
    // styles.shareButton has minHeight 38 (< 44); hitSlop expands the tappable area.
    expect(shopSource).toContain("hitSlop=");
  });

  it("guards overflow-prone titles with numberOfLines for Thai truncation", () => {
    // The hero summary title already had numberOfLines={1}; the referral title can overflow
    // under Thai, so it (and the section titles) get a numberOfLines guard. Assert the
    // referral title specifically is now line-clamped.
    expect(shopSource).toContain("styles.referralTitle");
    expect(shopSource).toMatch(/numberOfLines=\{\d+\}\s*\n?\s*style=\{styles\.referralTitle\}/);
  });

  it("encodes dynamic category links so backend categories with spaces and ampersands route correctly", () => {
    expect(shopSource).toContain("encodeURIComponent(shop.category)");
  });

  it("related store captions > given dark mode > then secondary cashback copy uses muted ink", () => {
    expect(shopSource).toMatch(/relatedCashbackCaption:[\s\S]*?color: colors\.muted/);
    expect(shopSource).not.toMatch(/relatedCashbackCaption:[\s\S]*?color: colors\.textSoft/);
  });
});
