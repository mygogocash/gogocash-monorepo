"use client";

import { useEffect, useState } from "react";
import {
  getMissingOrderClaimStorageKey,
  MISSING_ORDER_CLAIM_EVENTS,
  MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY,
} from "@/lib/missingOrders/walletClaimSubmissions";

/**
 * Bumps a counter when missing-order claims change (same tab or cross-tab), so consumers can re-read localStorage.
 */
export function useMissingOrderClaimRefresh(accountKey: string): number {
  const [claimRefresh, setClaimRefresh] = useState(0);

  useEffect(() => {
    const bump = () => setClaimRefresh((n) => n + 1);
    window.addEventListener(MISSING_ORDER_CLAIM_EVENTS.updated, bump);
    const storageKey = getMissingOrderClaimStorageKey(accountKey);
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey || e.key === MISSING_ORDER_CLAIM_LEGACY_STORAGE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MISSING_ORDER_CLAIM_EVENTS.updated, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, [accountKey]);

  return claimRefresh;
}
