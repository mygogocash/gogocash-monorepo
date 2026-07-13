import {
  applyPlatformFee,
  DEFAULT_PLATFORM_FEE_PERCENT,
} from "@/lib/commissionFee";
import { bestPercentFromPartnerRates } from "@/lib/offerDeeplink";

/** Raw partner % → form fields for the auto "apply platform fee" mode. */
export function commissionFieldsFromPartnerRaw(
  rawPercent: number,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): {
  commissionRaw: string;
  commission_store: number;
} | null {
  if (!Number.isFinite(rawPercent) || rawPercent <= 0) return null;
  const rounded = Math.round(rawPercent * 100) / 100;
  return {
    commissionRaw: String(rounded),
    commission_store: applyPlatformFee(rounded, feePercent),
  };
}

/** Best raw partner % from stored commission rows (no live API). */
export function bestPartnerRawFromCommissions(commissions: unknown[]): number {
  return bestPercentFromPartnerRates(commissions);
}
