import type { LoginState } from "@mobile/analytics/events";

// Pure page-view tracking logic, extracted so it is unit-testable without React,
// expo-router, or PostHog. Mirrors the web app
// (gogocash_app-staging/src/lib/analytics.ts getPageTypeFromPathname +
// components/analytics/RouteAnalyticsTracker.tsx dedup) so the page_type taxonomy
// and page_view cadence match across platforms.

/** Map a route pathname to the web page_type taxonomy (verbatim from web). */
export function getMobilePageType(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Strip a leading locale segment the way the web does (Expo has no locale
  // prefix today, but keeping this is faithful and harmless).
  const routeSegments =
    segments[0] === "en" || segments[0] === "th" ? segments.slice(1) : segments;

  if (routeSegments.length === 0) return "home";
  if (routeSegments[0] === "shop" && routeSegments[1]) return "merchant_detail";
  if (routeSegments[0] === "shop") return "merchant_directory";
  if (routeSegments[0] === "category" && routeSegments[1]) return "merchant_category_detail";
  if (routeSegments[0] === "category") return "merchant_category_index";
  if (routeSegments[0] === "quest") return "merchant_quest";
  if (routeSegments[0] === "login") return "login";
  if (routeSegments[0] === "register") return "register";
  if (routeSegments[0] === "auth" && routeSegments[1] === "callback") return "auth_callback";
  if (routeSegments[0] === "profile") return "profile";
  if (routeSegments[0] === "favorite") return "favorite";
  if (routeSegments[0] === "wallet") return "wallet";
  if (routeSegments[0] === "withdraw") return "withdraw";
  if (routeSegments[0] === "referral") return "referral";
  if (routeSegments[0] === "subscription") return "subscription";
  if (routeSegments[0] === "membership") return "membership";

  return routeSegments[0];
}

/** Dedup gate: only fire when the path actually changed (web lastTrackedRef). */
export function shouldTrackPageView(lastPath: string, nextPath: string): boolean {
  return lastPath !== nextPath;
}

export type PageViewArgs = {
  pageType: string;
  pagePath: string;
  loginState: LoginState;
};

/** Build the trackPageView args from a pathname + whether a session exists. */
export function buildPageViewArgs(pathname: string, isAuthenticated: boolean): PageViewArgs {
  return {
    pageType: getMobilePageType(pathname),
    pagePath: pathname,
    loginState: isAuthenticated ? "authenticated" : "guest",
  };
}
