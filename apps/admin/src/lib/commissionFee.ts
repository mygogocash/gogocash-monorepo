/**
 * Platform-fee commission math.
 *
 * The user-facing commission is the raw partner rate reduced by the platform
 * fee (raw × (1 − fee/100)), rounded to 2 decimals. `reverse` recovers the raw
 * from a stored net so the raw input can be re-populated when an offer loads.
 * The fee % comes from Fee Structure (`ResponseFee.system`); 30 is only the
 * fallback when no configured rate is available.
 */
export const DEFAULT_PLATFORM_FEE_PERCENT = 30;

export const THIRTY_PERCENT_FEE_NET_FACTOR = 0.7;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Fee % → net factor (e.g. 30 → 0.7). Non-finite / out-of-range fees fall back to the 30% default. */
function netFactorForFee(feePercent: number): number {
  const fee =
    Number.isFinite(feePercent) && feePercent >= 0 && feePercent < 100
      ? feePercent
      : DEFAULT_PLATFORM_FEE_PERCENT;
  return 1 - fee / 100;
}

/** raw → net (raw minus the platform fee), rounded to 2 decimals. */
export function applyPlatformFee(raw: number, feePercent: number): number {
  return round2(raw * netFactorForFee(feePercent));
}

/** net → raw, the inverse of {@link applyPlatformFee}. */
export function reversePlatformFee(net: number, feePercent: number): number {
  return round2(net / netFactorForFee(feePercent));
}

/** raw → net at the default 30% fee (legacy fixed-fee call sites). */
export function applyThirtyPercentFee(raw: number): number {
  return applyPlatformFee(raw, DEFAULT_PLATFORM_FEE_PERCENT);
}

/** net → raw, the inverse of {@link applyThirtyPercentFee}. */
export function reverseThirtyPercentFee(net: number): number {
  return reversePlatformFee(net, DEFAULT_PLATFORM_FEE_PERCENT);
}

/**
 * Reconcile the raw-% display and the stored net when the Fee Structure rate
 * resolves asynchronously. If the admin authored the raw this session
 * (typed / partner-synced), the RAW is ground truth: recompute the stored net
 * with the real fee — otherwise a net baked at the 30% fallback would be
 * saved while the UI shows a different, correct-looking number. If the raw
 * was only seeded from the stored net, the NET is ground truth: re-derive the
 * raw display (a passive open must never rewrite stored economics).
 */
export function reconcileCommissionOnFeeChange(args: {
  rawEdited: boolean;
  raw: string;
  storedNet: number | null | undefined;
  feePercent: number;
}): { raw: string; storedNet: number | null } {
  if (args.rawEdited) {
    const n = Number(args.raw);
    return {
      raw: args.raw,
      storedNet:
        args.raw.trim() === "" || !Number.isFinite(n)
          ? null
          : applyPlatformFee(n, args.feePercent),
    };
  }
  return {
    raw:
      args.storedNet != null
        ? String(reversePlatformFee(args.storedNet, args.feePercent))
        : "",
    storedNet: args.storedNet ?? null,
  };
}
