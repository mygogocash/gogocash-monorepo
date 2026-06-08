/**
 * "Auto apply 30% fee" commission math.
 *
 * The user-facing commission is the raw partner rate reduced by a 30% fee
 * (raw × 0.7), rounded to 2 decimals. `reverse` recovers the raw from a stored
 * net (net / 0.7) so the raw input can be re-populated when an offer loads.
 */
export const THIRTY_PERCENT_FEE_NET_FACTOR = 0.7;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** raw → net (raw minus the 30% fee), rounded to 2 decimals. */
export function applyThirtyPercentFee(raw: number): number {
  return round2(raw * THIRTY_PERCENT_FEE_NET_FACTOR);
}

/** net → raw, the inverse of {@link applyThirtyPercentFee}. */
export function reverseThirtyPercentFee(net: number): number {
  return round2(net / THIRTY_PERCENT_FEE_NET_FACTOR);
}
