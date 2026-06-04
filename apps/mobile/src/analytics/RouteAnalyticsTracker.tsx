import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";

import { trackPageView } from "@mobile/analytics/events";
import { buildPageViewArgs, shouldTrackPageView } from "@mobile/analytics/pageTracking";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";

// Render-null route tracker — mirrors the web RouteAnalyticsTracker: fire one
// page_view per distinct pathname (deduped), with login_state derived from the
// current session. Mounted once inside AppProviders so it has PostHog + the
// router in scope and covers every screen without per-screen edits.
export function RouteAnalyticsTracker() {
  const pathname = usePathname();
  const analytics = useAnalytics();
  const session = useMobileSessionSnapshot();
  const lastTrackedRef = useRef("");

  // MobileSession is a Partial<Record<MobileSessionField,...>>; the token field is
  // "access_token" (snake_case) — same key the route guard (useAuthGuardSession) gates on.
  const isAuthenticated = Boolean(session?.["access_token"]);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (!shouldTrackPageView(lastTrackedRef.current, pathname)) {
      return;
    }

    lastTrackedRef.current = pathname;

    trackPageView(analytics, buildPageViewArgs(pathname, isAuthenticated));
  }, [analytics, pathname, isAuthenticated]);

  return null;
}
