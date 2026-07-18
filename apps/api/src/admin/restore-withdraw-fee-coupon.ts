export const WITHDRAW_ADMIN_STATUSES = [
  'pending',
  'approved',
  'paid',
  'rejected',
] as const;

export type WithdrawAdminStatus = (typeof WITHDRAW_ADMIN_STATUSES)[number];

const ALLOWED_WITHDRAW_STATUS_TRANSITIONS: Record<
  WithdrawAdminStatus,
  readonly WithdrawAdminStatus[]
> = {
  pending: ['pending', 'approved', 'rejected'],
  // In the bank-transfer workflow "approved" means the payout was confirmed.
  // Releasing its reservation requires a separate compensating workflow, not
  // a direct status flip that would make already-paid funds withdrawable again.
  approved: ['approved'],
  paid: ['paid'],
  rejected: ['rejected'],
};

/** Paid and rejected withdrawals are terminal money states. */
export function isAllowedWithdrawStatusTransition(
  previousStatus: string,
  nextStatus: WithdrawAdminStatus,
): boolean {
  const previous = String(previousStatus).trim().toLowerCase();
  if (!WITHDRAW_ADMIN_STATUSES.includes(previous as WithdrawAdminStatus)) {
    return false;
  }
  return ALLOWED_WITHDRAW_STATUS_TRANSITIONS[
    previous as WithdrawAdminStatus
  ].includes(nextStatus);
}

/** Decide whether a rejection should reverse a fee-coupon redemption. */
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
