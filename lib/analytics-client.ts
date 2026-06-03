import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { isMarketingAnalyticsEnabled } from "@/lib/app-config";
import { isAnalyticsAllowed } from "@/lib/cookie-consent";
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

/** SPA / client navigations — skip duplicating the first load (SDK handles initial hit). */
export function logPageView(pagePath: string): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "page_view", {
      page_path: pagePath.startsWith("/") ? pagePath : `/${pagePath}`,
      page_title: document.title,
      page_location: window.location.href,
    });
  } catch {
    /* SDK not ready */
  }
}

/** Site search page (`/search?q=`) — GA4 recommended `search` event. */
export function logSiteSearch(searchTerm: string): void {
  const term = searchTerm.trim();
  if (!term) return;
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "search", { search_term: term });
  } catch {
    /* noop */
  }
}

export function logLocaleLanguageSelect(lang: string): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "select_content", {
      content_type: "locale_language",
      item_id: lang,
    });
  } catch {
    /* noop */
  }
}

export function logLocaleRegionSelect(region: string): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "select_content", {
      content_type: "locale_region",
      item_id: region,
    });
  } catch {
    /* noop */
  }
}

export function logLaunchAppClick(surface: "web_desktop" | "line_mobile"): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "select_content", {
      content_type: "cta_launch_app",
      item_id: surface,
    });
  } catch {
    /* noop */
  }
}

export function logBrandsLoadMore(visibleCount: number, totalBrands: number): void {
  const analytics = getAnalyticsSafe();
  if (!analytics) return;
  try {
    logEvent(analytics, "select_content", {
      content_type: "brands_load_more",
      item_id: `${visibleCount}_of_${totalBrands}`,
    });
  } catch {
    /* noop */
  }
}
