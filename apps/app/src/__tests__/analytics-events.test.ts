import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENTS,
  identifyUser,
  resetIdentity,
  trackCashbackWithdrawSuccess,
  trackCategorySelect,
  trackCompleteRegistration,
  trackPageView,
  trackPromotionSelect,
  trackQuestStarted,
  type MobileAnalyticsClient,
} from "@mobile/analytics/events";

// Behavioral tests (not source-string). The Expo analytics vocabulary must mirror
// the web app (gogocash_app-staging/src/lib/analytics.ts) PostHog/GA4 events
// EXACTLY — same event names + same snake_case property keys — so cross-platform
// dashboards/funnels stay comparable. Source of truth: web dispatchAnalyticsEvent
// call sites + PostHogAuthSync identify payload. The one intentional divergence is
// platform: "mobile" (web sends "web").
function makeClient(): { client: MobileAnalyticsClient; capture: ReturnType<typeof vi.fn>; identify: ReturnType<typeof vi.fn>; reset: ReturnType<typeof vi.fn> } {
  const capture = vi.fn();
  const identify = vi.fn();
  const reset = vi.fn();
  return { client: { capture, identify, reset }, capture, identify, reset };
}

describe("analytics event names mirror the web taxonomy", () => {
  it("uses the exact GA4/PostHog event names the web app fires", () => {
    expect(ANALYTICS_EVENTS).toMatchObject({
      pageView: "page_view",
      categorySelect: "merchant_category_select",
      selectPromotion: "select_promotion",
      questStarted: "quest_started",
      cashbackWithdrawSuccess: "cashback_withdraw_success",
      completeRegistration: "complete_registration",
    });
  });
});

describe("analytics event helpers", () => {
  it("trackPageView > captures page_view with page_path, page_type and site_name", () => {
    const { client, capture } = makeClient();
    trackPageView(client, { pageType: "wallet", pagePath: "/wallet", loginState: "authenticated" });
    expect(capture).toHaveBeenCalledWith("page_view", {
      page_type: "wallet",
      page_path: "/wallet",
      login_state: "authenticated",
      site_name: "GoGoCash",
    });
  });

  it("trackCategorySelect > captures merchant_category_select with merchant_category + source_section", () => {
    const { client, capture } = makeClient();
    trackCategorySelect(client, { categoryName: "Food", source: "home_grid" });
    expect(capture).toHaveBeenCalledWith("merchant_category_select", {
      merchant_category: "Food",
      source_section: "home_grid",
    });
  });

  it("trackPromotionSelect > captures select_promotion with promotion_id/name/creative_slot", () => {
    const { client, capture } = makeClient();
    trackPromotionSelect(client, {
      promotionId: "banner-1",
      promotionName: "Songkran",
      creativeSlot: "home_hero",
      destination: "/shop/grocery-galaxy",
    });
    expect(capture).toHaveBeenCalledWith("select_promotion", {
      promotion_id: "banner-1",
      promotion_name: "Songkran",
      creative_slot: "home_hero",
      destination: "/shop/grocery-galaxy",
    });
  });

  it("trackQuestStarted > captures quest_started with source_section", () => {
    const { client, capture } = makeClient();
    trackQuestStarted(client, { source: "mission_list" });
    expect(capture).toHaveBeenCalledWith("quest_started", { source_section: "mission_list" });
  });

  it("trackCashbackWithdrawSuccess > mirrors web payload (value/currency/withdraw_method/cashback_type)", () => {
    const { client, capture } = makeClient();
    trackCashbackWithdrawSuccess(client, { amount: 500, currency: "THB", method: "promptpay", source: "wallet" });
    expect(capture).toHaveBeenCalledWith("cashback_withdraw_success", {
      value: 500,
      currency: "THB",
      withdraw_method: "promptpay",
      source_section: "wallet",
      cashback_type: "mycashback",
      login_state: "authenticated",
    });
  });

  it("trackCompleteRegistration > captures complete_registration with auth_provider + source_section", () => {
    const { client, capture } = makeClient();
    trackCompleteRegistration(client, { authProvider: "phone", source: "otp" });
    expect(capture).toHaveBeenCalledWith("complete_registration", {
      auth_provider: "phone",
      source_section: "otp",
      login_state: "authenticated",
    });
  });

  it("omits undefined optional properties (compact payload, like web compactObject)", () => {
    const { client, capture } = makeClient();
    trackQuestStarted(client, {});
    expect(capture).toHaveBeenCalledWith("quest_started", {});
  });
});

describe("identity sync mirrors web PostHogAuthSync (platform: mobile)", () => {
  it("identifyUser > calls identify with the web person-property shape but platform=mobile", () => {
    const { client, identify } = makeClient();
    identifyUser(client, "user-123", { region: "TH", locale: "th", authFlow: "login" });
    expect(identify).toHaveBeenCalledWith("user-123", {
      region: "TH",
      locale: "th",
      login_state: "authenticated",
      platform: "mobile",
      auth_flow: "login",
    });
  });

  it("resetIdentity > calls client.reset on logout", () => {
    const { client, reset } = makeClient();
    resetIdentity(client);
    expect(reset).toHaveBeenCalledOnce();
  });
});

describe("analytics never breaks a user flow", () => {
  it("is a no-op when the client is null/undefined (PostHog provider absent)", () => {
    expect(() => trackPageView(null, { pageType: "home", pagePath: "/" })).not.toThrow();
    expect(() => identifyUser(undefined, "u", { region: "TH", locale: "en" })).not.toThrow();
  });

  it("swallows capture/identify errors so analytics never throws into a screen", () => {
    const throwing: MobileAnalyticsClient = {
      capture: () => {
        throw new Error("network down");
      },
      identify: () => {
        throw new Error("network down");
      },
      reset: () => {
        throw new Error("network down");
      },
    };
    expect(() => trackQuestStarted(throwing, { source: "x" })).not.toThrow();
    expect(() => identifyUser(throwing, "u", { region: "TH", locale: "en" })).not.toThrow();
    expect(() => resetIdentity(throwing)).not.toThrow();
  });
});
