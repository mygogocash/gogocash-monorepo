import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { isMarketingAnalyticsEnabled } from "@/lib/app-config";
import { isAnalyticsAllowed } from "@/lib/cookie-consent";
import { posthogCapture } from "@/lib/posthog-client";
import { getFirebaseApp } from "@/lib/firebase";

/**
 * One-time Analytics bootstrap (browser, after `getFirebaseApp()`).
 * Call from `FirebaseClientInit` only. No-op until cookie consent is granted (#7).
 */
export function initFirebaseAnalytics(): void {
  if (!isMarketingAnalyticsEnabled() || !isAnalyticsAllowed()) return;
  const app = getFirebaseApp();
  if (!app) return;

  void isSupported().then((supported) => {
    if (!supported) return;
    getAnalytics(app);
  });
}

function getAnalyticsSafe(): ReturnType<typeof getAnalytics> | undefined {
  if (typeof window === "undefined") return undefined;
  if (!isMarketingAnalyticsEnabled() || !isAnalyticsAllowed()) return undefined;
  const app = getFirebaseApp();
  if (!app) return undefined;
  try {
    return getAnalytics(app);
  } catch {
    return undefined;
  }
}

/** Fire a GA4 event when Firebase analytics is available (consent-gated). */
function logFirebase(name: string, params?: Record<string, unknown>): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, name, params);
  } catch {
    /* SDK not ready */
  }
}

/** SPA / client navigations — skip duplicating the first load (SDK handles initial hit). */
export function logPageView(pagePath: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  logFirebase("page_view", {
    page_path: pagePath.startsWith("/") ? pagePath : `/${pagePath}`,
    page_title: document.title,
    page_location: window.location.href,
  });
}

/** Site search page (`/search?q=`) — GA4 recommended `search` event + PostHog. */
export function logSiteSearch(searchTerm: string): void {
  const term = searchTerm.trim();
  if (!term) return;
  logFirebase("search", { search_term: term });
  posthogCapture("site_search", { query: term });
}

export function logLocaleLanguageSelect(lang: string): void {
  logFirebase("select_content", {
    content_type: "locale_language",
    item_id: lang,
  });
  posthogCapture("locale_language_selected", { lang });
}

export function logLocaleRegionSelect(region: string): void {
  logFirebase("select_content", {
    content_type: "locale_region",
    item_id: region,
  });
  posthogCapture("locale_region_selected", { region });
}

/**
 * Primary "launch app" CTA. `destination` is the resolved target (web on desktop,
 * LINE on mobile); `placement` is where on the page it was clicked (hero, final,
 * feature, header, quests) — powering CTA-performance breakdowns in PostHog.
 */
export function logLaunchAppClick(
  destination: "web_desktop" | "line_mobile",
  placement = "unknown",
): void {
  logFirebase("select_content", {
    content_type: "cta_launch_app",
    item_id: destination,
  });
  posthogCapture("cta_clicked", { destination, placement });
}

export function logBrandsLoadMore(
  visibleCount: number,
  totalBrands: number,
): void {
  logFirebase("select_content", {
    content_type: "brands_load_more",
    item_id: `${visibleCount}_of_${totalBrands}`,
  });
  posthogCapture("brands_load_more", {
    visible: visibleCount,
    total: totalBrands,
  });
}
