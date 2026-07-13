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

/** Payload row shape the create-brand endpoint accepts. */
export type FinalizedProductTypeRow = {
  name: string;
  commission_info: string;
  deeplink: string;
};

/**
 * Build the create-brand payload rows at SUBMIT time. Auto rows recompute
 * their net from the raw % with the fee that is current now — the
 * commission_info string frozen at typing time may predate the Fee Structure
 * fetch resolving (i.e. it was baked with the 30% fallback).
 */
export function finalizeProductTypeRows(
  rows: Array<{
    name: string;
    commission_info: string;
    deeplink?: string | null;
    entry_mode?: "manual" | "auto";
    commission_raw?: string;
  }>,
  feePercent: number,
): FinalizedProductTypeRow[] {
  return rows
    .map((row) => {
      const isAuto = row.entry_mode === "auto";
      const raw = (row.commission_raw ?? "").trim();
      const net = isAuto && raw ? netCommissionFromRaw(raw, feePercent) : "";
      return {
        name: row.name.trim(),
        commission_info:
          isAuto && raw
            ? net === ""
              ? ""
              : `${net}%`
            : row.commission_info.trim(),
        deeplink: (row.deeplink ?? "").trim(),
      };
    })
    .filter(
      (row) =>
        row.name.length > 0 ||
        row.commission_info.length > 0 ||
        row.deeplink.length > 0,
    );
}
