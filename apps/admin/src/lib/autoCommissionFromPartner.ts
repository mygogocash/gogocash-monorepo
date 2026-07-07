import { applyThirtyPercentFee } from "@/lib/commissionFee";
import { bestPercentFromPartnerRates } from "@/lib/offerDeeplink";

/** Raw partner % → form fields for "Auto apply 30% fee" mode. */
export function commissionFieldsFromPartnerRaw(rawPercent: number): {
  commissionRaw: string;
  commission_store: number;
} | null {
  if (!Number.isFinite(rawPercent) || rawPercent <= 0) return null;
  const rounded = Math.round(rawPercent * 100) / 100;
  return {
    commissionRaw: String(rounded),
    commission_store: applyThirtyPercentFee(rounded),
  };
}

/** Best raw partner % from stored commission rows (no live API). */
export function bestPartnerRawFromCommissions(commissions: unknown[]): number {
  return bestPercentFromPartnerRates(commissions);
}
