"use client";

import { useEffect } from "react";
import { initFirebaseAnalytics } from "@/lib/analytics-client";
import { COOKIE_CONSENT_EVENT, isAnalyticsAllowed } from "@/lib/cookie-consent";
import { getFirebaseApp } from "@/lib/firebase";

/**
 * Browser-only: `initializeApp` + GA4 via `initFirebaseAnalytics()` (modular SDK).
 * Gated on cookie consent (#7): nothing initializes until the visitor accepts.
 */
export function FirebaseClientInit() {
  useEffect(() => {
    const start = () => {
      if (!isAnalyticsAllowed()) return;
      getFirebaseApp();
      initFirebaseAnalytics();
    };

    start(); // returning visitors who already accepted
    window.addEventListener(COOKIE_CONSENT_EVENT, start);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, start);
  }, []);

  return null;
}
