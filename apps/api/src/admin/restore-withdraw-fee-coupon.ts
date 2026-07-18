/**
 * Decide whether rejecting a withdraw should reverse a fee-coupon redemption.
 * Idempotent restore is enforced by deleting the redemption row first.
 */
export function shouldRestoreWithdrawFeeCoupon(input: {
  previousStatus: string | undefined | null;
  nextStatus: string;
  couponId: unknown;
}): boolean {
  const prev = String(input.previousStatus ?? '')
    .trim()
    .toLowerCase();
  const next = String(input.nextStatus ?? '')
    .trim()
    .toLowerCase();
  if (next !== 'rejected') {
    return false;
  }
  if (prev === 'rejected') {
    return false;
  }
  return Boolean(input.couponId);
}
