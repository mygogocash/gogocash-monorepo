"use client";

import { useEffect } from "react";
import { COOKIE_CONSENT_EVENT } from "@/lib/cookie-consent";
import { syncPostHogConsent } from "@/lib/posthog-client";

/**
 * Browser-only PostHog bootstrap, gated on cookie consent (#7). Mirrors
 * FirebaseClientInit: nothing loads until the visitor accepts, and a later
 * accept/reject re-syncs capture state.
 */
export function PostHogInit() {
  useEffect(() => {
    void syncPostHogConsent(); // returning visitors who already accepted
    const onConsent = () => void syncPostHogConsent();
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
