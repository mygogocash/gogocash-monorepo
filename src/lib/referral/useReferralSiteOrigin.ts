"use client";

import { useSyncExternalStore } from "react";
import { referralSiteOriginFromEnv, referralSiteOriginFromWindow } from "./referralLink";

/**
 * Stable public origin for referral URLs: `NEXT_PUBLIC_FRONTEND_URL`, else `window.location.origin` on the client.
 * Server snapshot is env-only to avoid hydration mismatch when env is set; when env is empty, client may briefly differ then reconcile.
 */
export function useReferralSiteOrigin(): string {
  return useSyncExternalStore(
    () => () => {},
    () => referralSiteOriginFromEnv() || referralSiteOriginFromWindow(),
    () => referralSiteOriginFromEnv()
  );
}
