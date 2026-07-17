import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Linking } from "react-native";

const couponRedirectMocks = vi.hoisted(() => ({
  auth: { isAuthed: true, ready: true },
  mintUserTrackingLink: vi.fn(),
  routerPush: vi.fn(),
  session: {
    current: { access_token: "backend-jwt" } as { access_token: string } | null,
  },
}));

// CustomerShopDetailScreen reaches i18n/LocaleProvider (via useCopy/AccountPageShell-free
// path it still uses tc()), which touches expo-localization (-> expo-modules-core) and the
// native `expo` global that does not exist under happy-dom. Device locale is not under test,
// so mock the module at the seam — the same pattern the wallet/auth/profile render tests use.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("expo-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("expo-router")>();
  const router = {
    ...actual.router,
    push: couponRedirectMocks.routerPush,
  };
  return {
    ...actual,
    router,
    useRouter: () => router,
  };
});

vi.mock("@mobile/api/affiliateDeeplink", () => ({
  mintUserTrackingLink: couponRedirectMocks.mintUserTrackingLink,
}));

vi.mock("@mobile/auth/useAuthGuardSession", () => ({
  useAuthGuardSession: () => couponRedirectMocks.auth,
}));

vi.mock("@mobile/auth/useMobileSessionSnapshot", () => ({
  useMobileSessionSnapshot: () => couponRedirectMocks.session.current,
}));

const merchantResourceState = vi.hoisted(() => ({
  data: null as unknown,
  status: "ready" as "ready" | "loading" | "empty" | "error" | "offline",
  source: "fixtures" as "fixtures" | "backend",
}));

const couponResourceState = vi.hoisted(() => ({
  data: null as unknown,
  status: "empty" as "ready" | "loading" | "empty" | "error" | "offline",
  source: "fixtures" as "fixtures" | "backend",
}));

vi.mock("@mobile/account/customerAccountResource", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@mobile/account/customerAccountResource")
    >();
  return {
    ...actual,
    useCustomerAccountResource: (options: {
      resourceId: string;
      fixtureData: unknown;
    }) => {
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
      if (options.resourceId === "merchantCoupons") {
        return {
          data: couponResourceState.data,
          endpoint: "/offer/get-coupon-id/test",
          error:
            couponResourceState.status === "error"
              ? new Error("coupon request failed")
              : null,
          retry: vi.fn(),
          source: couponResourceState.source,
          status: couponResourceState.status,
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
import { ShopCouponDeals } from "@mobile/components/shop/ShopCouponDeals";
import {
  peekPendingShopNowIntent,
  resetPendingShopNowIntentForTests,
} from "@mobile/auth/shopNowIntent";
import { getMobileEnv } from "@mobile/config/env";
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
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../screens/CustomerShopDetailScreen.tsx",
  ),
  "utf8",
);

// Mount inside QueryClientProvider (useCustomerAccountResource calls useQuery
// unconditionally; default account data source is "fixtures" so the resource resolves to
// "ready" and the screen renders its content) AND ToastProvider (the referral Share action
// consumes useToast(), which throws without a provider — same as the offers render test).
function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        ToastProvider,
        {},
        createElement(CustomerShopDetailScreen, {}),
      ),
    ),
  );
}

describe("CustomerShopDetailScreen (render)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    couponRedirectMocks.auth.isAuthed = true;
    couponRedirectMocks.auth.ready = true;
    couponRedirectMocks.session.current = { access_token: "backend-jwt" };
    couponRedirectMocks.mintUserTrackingLink.mockReset();
    couponRedirectMocks.mintUserTrackingLink.mockResolvedValue(
      "https://attributed.example/user-coupon-link",
    );
    couponRedirectMocks.routerPush.mockReset();
    resetPendingShopNowIntentForTests();
    merchantResourceState.data = null;
    merchantResourceState.status = "ready";
    merchantResourceState.source = "fixtures";
    couponResourceState.data = null;
    couponResourceState.status = "empty";
    couponResourceState.source = "fixtures";
  });

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

  it("renders the active GoDaddy code-less coupon without a fake code or copy action", () => {
    merchantResourceState.data = {
      _id: "6a5647ed535424c5c9370c0a",
      offer_name: "GoDaddy - CPS",
      offer_name_display: "GoDaddy",
      categories: "Digital Services",
      commissions: [{ Commission: "5%" }],
      tracking_link: "https://tracking.example/godaddy",
    };
    merchantResourceState.source = "backend";
    couponResourceState.data = [
      {
        _id: "6a564de4535424c5c9370c0e",
        name: "Love U",
        description: "10% off eligible orders",
        code: "",
        discount: 10,
        discount_type: "cash",
        discount_currency: "THB",
        code_enabled: false,
        destination_url: "https://tracking.example/godaddy?coupon=love-u",
        eligibility: "members",
        min_spend: "100",
        min_spend_currency: "THB",
        max_cap: 500,
        max_cap_enabled: true,
        max_cap_currency: "THB",
        one_time_use_enabled: false,
        usage_per_user: 3,
        remaining_quantity: 4,
        terms_and_conditions: "Valid for members only.",
        start_date: "2026-07-10",
        start_time: "09:30",
        end_date: "2026-07-22",
        end_time: "22:15",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("Love U")).toBeTruthy();
    expect(screen.getByText("THB 10 off")).toBeTruthy();
    expect(screen.getByText("Minimum spend THB 100")).toBeTruthy();
    expect(screen.getByText("Valid from 2026-07-10 09:30")).toBeTruthy();
    expect(screen.getByText("Valid until 2026-07-22 22:15")).toBeTruthy();
    expect(screen.queryByText("Copy code")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Use coupon Love U" }),
    ).toBeTruthy();
    const termsButton = screen.getByRole("button", {
      name: "Read terms & conditions for Love U",
    });
    expect(termsButton).toBeTruthy();
    expect(screen.queryByText("Valid for members only.")).toBeNull();
    fireEvent.click(termsButton);
    expect(screen.getByText("Valid for members only.")).toBeTruthy();
    expect(screen.getByText("Eligibility members")).toBeTruthy();
    expect(screen.getByText("Maximum discount THB 500")).toBeTruthy();
    expect(screen.getByText("3 uses per user")).toBeTruthy();
    expect(screen.getByText("4 remaining")).toBeTruthy();
    expect(screen.queryByText("No deals available right now")).toBeNull();
  });

  it("mints a user-attributed link from the exact verified no-code coupon destination", async () => {
    merchantResourceState.data = {
      _id: "merchant-link-only",
      merchant_id: 7339,
      offer_name: "Link Merchant",
      offer_id: 339,
      tracking_link: "https://merchant.example/general",
    };
    merchantResourceState.source = "backend";
    couponResourceState.data = [
      {
        _id: "coupon-link-only",
        name: "Link-only deal",
        code_enabled: false,
        destination_url: "https://tracking.example/exact?coupon=1",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";
    const openUrl = vi.spyOn(Linking, "openURL").mockResolvedValue(true);

    renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Use coupon Link-only deal" }),
    );

    expect(couponRedirectMocks.mintUserTrackingLink).toHaveBeenCalledWith({
      accessToken: "backend-jwt",
      apiUrl: getMobileEnv().apiUrl,
      deeplink: "https://tracking.example/exact?coupon=1",
      merchantId: 7339,
      offerId: 339,
    });
    expect(
      screen.getByRole("alert", { name: "Moving to Link Merchant" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByText("Tap here"));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith(
        "https://attributed.example/user-coupon-link",
      );
    });
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalledWith(
      "https://tracking.example/exact?coupon=1",
    );
    expect(openUrl).not.toHaveBeenCalledWith(
      "https://merchant.example/general",
    );
  });

  it("falls back to the live merchant tracking URL when Shop Now minting fails", async () => {
    couponRedirectMocks.mintUserTrackingLink.mockResolvedValue(null);
    merchantResourceState.data = {
      _id: "merchant-shop-now-fallback",
      merchant_id: 7339,
      offer_name: "Fallback Merchant",
      offer_id: 339,
      tracking_link: "https://merchant.example/general-tracked",
    };
    merchantResourceState.source = "backend";
    const openUrl = vi.spyOn(Linking, "openURL").mockResolvedValue(true);

    renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Shop now at Fallback Merchant" }),
    );

    expect(couponRedirectMocks.mintUserTrackingLink).toHaveBeenCalledWith({
      accessToken: "backend-jwt",
      apiUrl: getMobileEnv().apiUrl,
      deeplink: "",
      merchantId: 7339,
      offerId: 339,
    });
    fireEvent.click(screen.getByText("Tap here"));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith(
        "https://merchant.example/general-tracked",
      );
    });
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalledWith(
      "https://www.google.com/search?q=Fallback%20Merchant",
    );
  });

  it("preserves only the coupon id through login and re-resolves the current backend destination", async () => {
    couponRedirectMocks.auth.isAuthed = false;
    couponRedirectMocks.session.current = null;
    merchantResourceState.data = {
      _id: "merchant-link-only",
      merchant_id: 7339,
      offer_name: "Link Merchant",
      offer_id: 339,
      tracking_link: "https://merchant.example/general",
    };
    merchantResourceState.source = "backend";
    couponResourceState.data = [
      {
        _id: "coupon-link-only",
        name: "Link-only deal",
        code_enabled: false,
        destination_url: "https://tracking.example/exact?coupon=1",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";
    const openUrl = vi.spyOn(Linking, "openURL").mockResolvedValue(true);

    const loggedOutRender = renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Use coupon Link-only deal" }),
    );

    expect(couponRedirectMocks.routerPush).toHaveBeenCalledWith(
      "/login?callbackUrl=%2Fshop%2Fmerchant-link-only",
    );
    expect(peekPendingShopNowIntent("merchant-link-only")).toEqual({
      couponId: "coupon-link-only",
    });
    expect(couponRedirectMocks.mintUserTrackingLink).not.toHaveBeenCalled();
    expect(openUrl).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();

    loggedOutRender.unmount();
    couponRedirectMocks.auth.isAuthed = true;
    couponRedirectMocks.session.current = { access_token: "backend-jwt" };
    couponResourceState.data = [
      {
        _id: "coupon-link-only",
        name: "Link-only deal",
        code_enabled: false,
        destination_url:
          "https://tracking.example/current-after-login?coupon=1",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      },
    ];

    renderScreen();

    await waitFor(() => {
      expect(couponRedirectMocks.mintUserTrackingLink).toHaveBeenCalledWith(
        expect.objectContaining({
          deeplink: "https://tracking.example/current-after-login?coupon=1",
        }),
      );
    });
    expect(couponRedirectMocks.mintUserTrackingLink).toHaveBeenCalledTimes(1);
    expect(couponRedirectMocks.mintUserTrackingLink).not.toHaveBeenCalledWith(
      expect.objectContaining({
        deeplink: "https://tracking.example/exact?coupon=1",
      }),
    );
  });

  it("falls back only to the exact verified coupon destination when minting fails", async () => {
    couponRedirectMocks.mintUserTrackingLink.mockResolvedValue(null);
    merchantResourceState.data = {
      _id: "merchant-link-only",
      merchant_id: 7339,
      offer_name: "Link Merchant",
      offer_id: 339,
      tracking_link: "https://merchant.example/general",
    };
    merchantResourceState.source = "backend";
    couponResourceState.data = [
      {
        _id: "coupon-link-only",
        name: "Link-only deal",
        code_enabled: false,
        destination_url: "https://tracking.example/exact?coupon=1",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";
    const openUrl = vi.spyOn(Linking, "openURL").mockResolvedValue(true);

    renderScreen();
    fireEvent.click(
      screen.getByRole("button", { name: "Use coupon Link-only deal" }),
    );
    fireEvent.click(screen.getByText("Tap here"));

    await waitFor(() => {
      expect(openUrl).toHaveBeenCalledWith(
        "https://tracking.example/exact?coupon=1",
      );
    });
    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalledWith(
      "https://merchant.example/general",
    );
    expect(openUrl).not.toHaveBeenCalledWith(
      "https://www.google.com/search?q=Link%20Merchant",
    );
  });

  it("renders a safe unavailable state when a no-code coupon has no destination", () => {
    couponResourceState.data = [
      {
        _id: "coupon-no-destination",
        name: "Unavailable link deal",
        code_enabled: false,
        start_date: "2026-07-01",
        end_date: "2026-07-31",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("Coupon link unavailable")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Use coupon Unavailable link deal",
      }),
    ).toBeNull();
  });
  it("invokes the no-code coupon callback with the selected coupon", () => {
    const onUseCoupon = vi.fn();
    const coupon = {
      code: null,
      codeEnabled: false,
      description: null,
      destinationUrl: "https://tracking.example/no-code",
      discount: 10,
      discountCurrency: "THB",
      discountType: "percent" as const,
      endDate: "2026-07-22",
      endTime: "22:15",
      eligibility: null,
      id: "coupon-no-code",
      link: null,
      maxCap: null,
      maxCapCurrency: null,
      minimumSpend: null,
      minimumSpendCurrency: null,
      name: "No-code deal",
      oneTimeUse: true,
      remainingQuantity: null,
      startDate: "2026-07-10",
      startTime: "09:30",
      termsAndConditions: null,
      usagePerUser: 1,
    };

    render(
      createElement(
        ToastProvider,
        {},
        createElement(ShopCouponDeals, {
          coupons: [coupon],
          emptySubtitle: "No coupons",
          emptyTitle: "No coupons",
          onRetry: vi.fn(),
          onUseCoupon,
          status: "ready",
          title: "Deals",
        }),
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Use coupon No-code deal" }),
    );
    expect(onUseCoupon).toHaveBeenCalledTimes(1);
    expect(onUseCoupon).toHaveBeenCalledWith(coupon);
  });

  it("never reclassifies an enabled coupon with a missing code as link-only", () => {
    const coupon = {
      code: null,
      codeEnabled: true,
      description: null,
      destinationUrl: "https://tracking.example/must-not-open",
      discount: null,
      discountCurrency: null,
      discountType: null,
      endDate: null,
      endTime: null,
      eligibility: null,
      id: "malformed-code-coupon",
      link: null,
      maxCap: null,
      maxCapCurrency: null,
      minimumSpend: null,
      minimumSpendCurrency: null,
      name: "Malformed code deal",
      oneTimeUse: null,
      remainingQuantity: null,
      startDate: null,
      startTime: null,
      termsAndConditions: "Legacy terms.",
      usagePerUser: null,
    };

    render(
      createElement(
        ToastProvider,
        {},
        createElement(ShopCouponDeals, {
          coupons: [coupon],
          emptySubtitle: "No coupons",
          emptyTitle: "No coupons",
          onRetry: vi.fn(),
          onUseCoupon: vi.fn(),
          status: "ready",
          title: "Deals",
        }),
      ),
    );

    expect(screen.getByText("Coupon code unavailable")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Use coupon Malformed code deal" }),
    ).toBeNull();
    expect(screen.queryByText("Copy code")).toBeNull();
  });
  it("renders a code coupon with copy and terms actions but no use CTA", () => {
    couponResourceState.data = [
      {
        _id: "coupon-code",
        name: "Save 20",
        code: "SAVE20",
        code_enabled: true,
        terms_and_conditions: "One use per customer.",
        start_date: "2026-07-10",
        end_date: "2026-07-22",
      },
    ];
    couponResourceState.status = "ready";
    couponResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("SAVE20")).toBeTruthy();
    expect(screen.getByText("Copy code")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Read terms & conditions for Save 20",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Use coupon Save 20" }),
    ).toBeNull();
  });

  it("renders the deals empty state only when the coupon resource is empty", () => {
    couponResourceState.status = "empty";

    renderScreen();

    expect(screen.getByText("No deals available right now")).toBeTruthy();
  });

  it("renders a load failure instead of claiming that no deals exist", () => {
    couponResourceState.status = "error";

    renderScreen();

    expect(screen.getByText("We could not load deals right now.")).toBeTruthy();
    expect(screen.queryByText("No deals available right now")).toBeNull();
  });

  it("renders API-derived tracking windows when the live offer carries tracking_period", () => {
    merchantResourceState.data = {
      _id: "6a49f3e6ce2e0da81d6dc375",
      offer_name: "Shopee Affiliate Program",
      offer_name_display: "Shopee",
      commissions: [{ Commission: "2.02%" }],
      tracking_link: "https://tracking.example/shopee",
      tracking_period: { tracking_days: 7, confirm_days: 45 },
    };
    merchantResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("within 7 day")).toBeTruthy();
    expect(screen.getByText("within 45 day")).toBeTruthy();
    expect(screen.queryByText("within 30 day")).toBeNull();
  });

  it("renders subtitle lines beneath the tracking steps when the API provides them", () => {
    merchantResourceState.data = {
      _id: "6a49f3e6ce2e0da81d6dc375",
      offer_name: "Shopee Affiliate Program",
      offer_name_display: "Shopee",
      commissions: [{ Commission: "2.02%" }],
      tracking_link: "https://tracking.example/shopee",
      tracking_period: {
        tracking_days: 7,
        confirm_days: 45,
        flow_type: "three_step",
        tracking_subtitle: "from the following month",
        confirm_subtitle: "after validation",
      },
    };
    merchantResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("from the following month")).toBeTruthy();
    expect(screen.getByText("after validation")).toBeTruthy();
  });

  it("renders the combined two-step cell (Purchase + Tracking and confirm) when the live offer is two_step", () => {
    merchantResourceState.data = {
      _id: "6a49f3e6ce2e0da81d6dc375",
      offer_name: "Shopee Affiliate Program",
      offer_name_display: "Shopee",
      commissions: [{ Commission: "2.02%" }],
      tracking_link: "https://tracking.example/shopee",
      tracking_period: {
        tracking_days: 7,
        confirm_days: 45,
        flow_type: "two_step",
        tracking_subtitle: "from the following month",
        confirm_subtitle: "after validation",
      },
    };
    merchantResourceState.source = "backend";

    renderScreen();

    expect(screen.getByText("Tracking and confirm")).toBeTruthy();
    expect(screen.getByText("within 45 day")).toBeTruthy();
    expect(screen.getByText("after validation")).toBeTruthy();
    // The tracking window collapses into the combined step.
    expect(screen.queryByText("within 7 day")).toBeNull();
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
    expect(shopSource).toMatch(
      /numberOfLines=\{\d+\}\s*\n?\s*style=\{styles\.referralTitle\}/,
    );
  });

  it("encodes dynamic category links so backend categories with spaces and ampersands route correctly", () => {
    expect(shopSource).toContain("encodeURIComponent(shop.category)");
  });

  it("related store cards > given the shared BrandCard > then no bespoke caption styles remain", () => {
    // Caption/ink treatment now comes from the shared compact BrandCard.
    expect(shopSource).toContain("<BrandCard");
    expect(shopSource).not.toContain("relatedCashbackCaption");
  });
});
