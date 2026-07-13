import {
  applyPlatformFee,
  DEFAULT_PLATFORM_FEE_PERCENT,
  reversePlatformFee,
} from "./commissionFee";

// Per-product-type commission entry: the admin types a raw partner number and
// the saved value is the net after the platform fee (raw × (1 − fee/100)),
// mirroring the main Cashback Management "Raw number → After fee (saved)"
// control. The raw is held only for editing; the net string is what persists
// in `commission_info`. The fee % comes from Fee Structure; 30 is the default.

/** Net (after the platform fee) as a string for a raw partner number; "" when blank, non-finite, or negative. */
export function netCommissionFromRaw(
  raw: string,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): string {
  const n = Number(raw);
  return raw.trim() === "" || !Number.isFinite(n) || n < 0
    ? ""
    : String(applyPlatformFee(n, feePercent));
}

/** Raw partner number (string) derived from a saved net string; "" when blank, non-finite, or negative. */
export function rawCommissionFromNet(
  net: string,
  feePercent: number = DEFAULT_PLATFORM_FEE_PERCENT,
): string {
  const n = Number(net);
  return net.trim() === "" || !Number.isFinite(n) || n < 0
    ? ""
    : String(reversePlatformFee(n, feePercent));
}
