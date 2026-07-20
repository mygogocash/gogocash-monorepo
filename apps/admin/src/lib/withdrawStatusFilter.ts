/** Status values the withdraw list filter + dashboard deep-links share. */
export const WITHDRAW_STATUS_FILTERS = [
  "pending",
  "approved",
  "rejected",
] as const;

export type WithdrawStatusFilter = (typeof WITHDRAW_STATUS_FILTERS)[number];

export function parseWithdrawStatusFilter(
  value: string | null | undefined,
): WithdrawStatusFilter | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "approved" ||
    normalized === "rejected"
  ) {
    return normalized;
  }
  return undefined;
}

/** Dashboard / KPI deep-link into Withdraw Management with an optional status filter. */
export function withdrawListHref(status?: WithdrawStatusFilter): string {
  return status ? `/withdraw?status=${status}` : "/withdraw";
}
