import { useEffect, useRef } from "react";

import { identifyUser, resetIdentity, type AppLocale } from "@mobile/analytics/events";
import { resolveIdentityDecision } from "@mobile/analytics/identitySync";
import { useAnalytics } from "@mobile/analytics/useAnalytics";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { useLocale } from "@mobile/i18n/LocaleProvider";

// Render-null session->identity bridge. The server sets PostHog distinct_id =
// Mongo user._id, but the client (anonymous device) never called identify, so
// client and server events landed on SEPARATE persons. This mounts once inside
// AppProviders (next to RouteAnalyticsTracker, so it has PostHog + LocaleProvider
// in scope) and, when a session becomes authenticated, calls identify with the
// backend user._id (the same id the server uses) so the two persons stitch. On
// sign-out it resets the identity.
//
// Person props are PDPA-safe only (region/locale/login_state/platform/auth_flow) —
// no email/phone/name — matching the web PostHogAuthSync payload but platform:
// "mobile". Goes through useAnalytics() + the event helpers, which no-op on a null
// or no-op client (keyless dev), so nothing fires without a real PostHog key.
export function AnalyticsIdentityBridge() {
  const analytics = useAnalytics();
  const session = useMobileSessionSnapshot();
  const { locale } = useLocale();
  // The last id we identified; lets us identify once per authenticated session
  // (not on every session-object edit like an avatar merge) and reset on logout.
  const lastIdentifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const decision = resolveIdentityDecision({
      lastIdentifiedUserId: lastIdentifiedUserIdRef.current,
      session,
    });

    if (decision.kind === "identify") {
      lastIdentifiedUserIdRef.current = decision.userId;
      identifyUser(analytics, decision.userId, {
        region: typeof session?.region === "string" ? session.region : undefined,
        locale: locale as AppLocale,
        authFlow: decision.authFlow,
      });
      return;
    }

    if (decision.kind === "reset") {
      lastIdentifiedUserIdRef.current = null;
      resetIdentity(analytics);
    }
  }, [analytics, session, locale]);

  return null;
}
