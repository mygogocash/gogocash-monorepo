import { useEffect, useState } from "react";

import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";

interface ReferralBonusPercentResponse {
  referral_bonus_percent?: number;
}

/**
 * Public read of the global referral bonus percentage (no auth). Backed by
 * GET /admin/referral-bonus-percent, which returns only the percentage — never
 * the admin-guarded fee internals. Returns undefined on any failure so the
 * caller falls back to the marketing fixture copy.
 */
export async function getReferralBonusPercent(): Promise<number | undefined> {
  try {
    const client = await getSharedMobileApiClient(getMobileEnv().apiUrl);
    if (!client) return undefined;
    const res = await client.get<ReferralBonusPercentResponse>(
      "/admin/referral-bonus-percent",
    );
    const value = res?.referral_bonus_percent;
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * React hook wrapper. Starts undefined (fixture copy renders first), then
 * overlays the live percent once fetched. Never throws — a failed fetch simply
 * leaves the fixture copy in place.
 */
export function useReferralBonusPercent(): number | undefined {
  const [percent, setPercent] = useState<number | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    void getReferralBonusPercent().then((value) => {
      if (!cancelled && value !== undefined) setPercent(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return percent;
}
