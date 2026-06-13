import { describe, expect, it } from "vitest";

import {
  buildProtectedLoginRedirect,
  findRouteForPathname,
  isAllowedInternalCallbackPath,
  isProtectedNativePath,
  sanitizeCallbackPath,
  shouldBlockProductionFixtureData,
} from "@mobile/auth/routeGuard";
import { getProtectedRouteIds } from "@mobile/navigation/routes";

describe("Expo protected route guard", () => {
  it("protected route guard > given every protected route pattern > then unauthenticated access redirects to login", () => {
    expect(getProtectedRouteIds().length).toBeGreaterThan(0);

    for (const pathname of [
      "/profile",
      "/profile/info",
      "/wallet",
      "/withdraw",
      "/billing",
      "/privacy-center",
      "/quest/history",
      "/gogosense",
      "/gogosense/merchant/grocery-galaxy",
    ]) {
      expect(isProtectedNativePath(pathname), pathname).toBe(true);
      expect(buildProtectedLoginRedirect(pathname), pathname).toBe(
        `/login?callbackUrl=${encodeURIComponent(pathname)}`
      );
    }
  });

  it("protected route guard > given public and auth routes > then they never redirect to themselves", () => {
    for (const pathname of ["/", "/login", "/register", "/auth/callback", "/shop/abc"]) {
      expect(isProtectedNativePath(pathname), pathname).toBe(false);
      expect(buildProtectedLoginRedirect(pathname), pathname).toBeNull();
    }
  });

  it("callback guard > given redirect-after-login targets > then only internal GoGoCash routes are allowed", () => {
    expect(isAllowedInternalCallbackPath("/wallet")).toBe(true);
    expect(isAllowedInternalCallbackPath("/gogosense/merchant/grocery-galaxy")).toBe(true);
    expect(sanitizeCallbackPath("/wallet")).toBe("/wallet");

    for (const unsafeValue of [
      "",
      "https://evil.example/profile",
      "http://evil.example/profile",
      "//evil.example/profile",
      "/\\evil",
      "/login",
      "/auth/callback?token=secret",
      "/wallet\nX-Header: injected",
    ]) {
      expect(isAllowedInternalCallbackPath(unsafeValue), unsafeValue).toBe(false);
      expect(sanitizeCallbackPath(unsafeValue), unsafeValue).toBe("/");
    }
  });

  it("route matcher > given dynamic native routes > then route lookup normalizes params and trailing slashes", () => {
    expect(findRouteForPathname("/category/Health%20%26%20Beauty/")).toMatchObject({
      id: "categoryDetail",
    });
    expect(findRouteForPathname("/shop/brand-grocery-galaxy-1001?utm=ignored")).toMatchObject({
      id: "shopDetail",
    });
    expect(findRouteForPathname("/gogosense/merchant/grocery-galaxy")).toMatchObject({
      id: "gogosenseMerchant",
    });
  });

  it("production fixture guard > given protected account data routes > then production blocks local fixtures until backend mode is enabled", () => {
    expect(shouldBlockProductionFixtureData("/wallet", "production", "fixtures")).toBe(true);
    expect(shouldBlockProductionFixtureData("/profile", "production", "disabled")).toBe(true);
    expect(shouldBlockProductionFixtureData("/wallet", "production", "backend")).toBe(false);
    expect(shouldBlockProductionFixtureData("/wallet", "staging", "fixtures")).toBe(false);
    expect(shouldBlockProductionFixtureData("/", "production", "fixtures")).toBe(false);
  });
});
