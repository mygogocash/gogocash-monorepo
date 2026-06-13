import {
  applyThirtyPercentFee,
  reverseThirtyPercentFee,
} from "./commissionFee";

// Per-product-type commission entry: the admin types a raw partner number and
// the saved value is the net after the 30% fee (raw × 0.7), mirroring the main
// Cashback Management "Raw number → After 30% fee (saved)" control. The raw is
// held only for editing; the net string is what persists in `commission_info`.

/** Net (after −30% fee) as a string for a raw partner number; "" when blank, non-finite, or negative. */
export function netCommissionFromRaw(raw: string): string {
  const n = Number(raw);
  return raw.trim() === "" || !Number.isFinite(n) || n < 0
    ? ""
    : String(applyThirtyPercentFee(n));
}

/** Raw partner number (string) derived from a saved net string; "" when blank, non-finite, or negative. */
export function rawCommissionFromNet(net: string): string {
  const n = Number(net);
  return net.trim() === "" || !Number.isFinite(n) || n < 0
    ? ""
    : String(reverseThirtyPercentFee(n));
}
