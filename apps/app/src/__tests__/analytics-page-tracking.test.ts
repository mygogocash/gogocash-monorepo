import { describe, expect, it, vi } from "vitest";

import {
  buildPageViewArgs,
  getMobilePageType,
  shouldTrackPageView,
} from "@mobile/analytics/pageTracking";
import { trackPageView, type MobileAnalyticsClient } from "@mobile/analytics/events";

// Slice 2 — page-view route tracking. The mapping + dedup logic is extracted into
// pure functions so it is unit-testable without React/expo-router/PostHog. Source
// of truth: web getPageTypeFromPathname + RouteAnalyticsTracker
// (gogocash_app-staging/src/lib/analytics.ts + components/analytics/RouteAnalyticsTracker.tsx).
describe("getMobilePageType (mirrors web getPageTypeFromPathname)", () => {
  it("maps the documented route shapes to the exact web page_type values", () => {
    expect(getMobilePageType("/")).toBe("home");
    expect(getMobilePageType("/shop/grocery-galaxy")).toBe("merchant_detail");
    expect(getMobilePageType("/shop")).toBe("merchant_directory");
    expect(getMobilePageType("/category/food")).toBe("merchant_category_detail");
    expect(getMobilePageType("/category")).toBe("merchant_category_index");
    expect(getMobilePageType("/quest")).toBe("merchant_quest");
    expect(getMobilePageType("/login")).toBe("login");
    expect(getMobilePageType("/register")).toBe("register");
    expect(getMobilePageType("/auth/callback")).toBe("auth_callback");
    expect(getMobilePageType("/profile")).toBe("profile");
    expect(getMobilePageType("/favorite")).toBe("favorite");
    expect(getMobilePageType("/wallet")).toBe("wallet");
    expect(getMobilePageType("/withdraw")).toBe("withdraw");
    expect(getMobilePageType("/referral")).toBe("referral");
    expect(getMobilePageType("/subscription")).toBe("subscription");
    expect(getMobilePageType("/membership")).toBe("membership");
  });

  it("falls back to the first segment for unmapped routes (web parity)", () => {
    expect(getMobilePageType("/gototrack")).toBe("gototrack");
    expect(getMobilePageType("/credit-score")).toBe("credit-score");
  });

  it("strips a leading en/th locale segment like the web does", () => {
    expect(getMobilePageType("/th/wallet")).toBe("wallet");
    expect(getMobilePageType("/en/shop/x")).toBe("merchant_detail");
  });
});

describe("shouldTrackPageView (dedup like web lastTrackedRef)", () => {
  it("tracks the first view of a path", () => {
    expect(shouldTrackPageView("", "/wallet")).toBe(true);
  });

  it("does not re-track the same path twice in a row", () => {
    expect(shouldTrackPageView("/wallet", "/wallet")).toBe(false);
  });

  it("tracks again after navigating to a different path", () => {
    expect(shouldTrackPageView("/wallet", "/profile")).toBe(true);
  });
});

describe("buildPageViewArgs", () => {
  it("derives page_type + login_state from pathname and session presence", () => {
    expect(buildPageViewArgs("/wallet", true)).toEqual({
      pageType: "wallet",
      pagePath: "/wallet",
      loginState: "authenticated",
    });
    expect(buildPageViewArgs("/login", false)).toEqual({
      pageType: "login",
      pagePath: "/login",
      loginState: "guest",
    });
  });
});

describe("page-view tracker integration with trackPageView", () => {
  it("captures page_view with the web property shape via the events helper", () => {
    const capture = vi.fn();
    const client: MobileAnalyticsClient = { capture };
    trackPageView(client, buildPageViewArgs("/shop/x", true));
    expect(capture).toHaveBeenCalledWith("page_view", {
      page_type: "merchant_detail",
      page_path: "/shop/x",
      login_state: "authenticated",
      site_name: "GoGoCash",
    });
  });
});
