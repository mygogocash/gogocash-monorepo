/** Status values the withdraw list filter + dashboard deep-links share. */
export const WITHDRAW_STATUS_FILTERS = [
  "pending",
  "approved",
  "rejected",
] as const;

export type WithdrawStatusFilter = (typeof WITHDRAW_STATUS_FILTERS)[number];

const STATUS_LABEL: Record<WithdrawStatusFilter, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

/** Select options for Withdraw Management — kept in sync with the parser. */
export const WITHDRAW_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...WITHDRAW_STATUS_FILTERS.map((value) => ({
    value,
    label: STATUS_LABEL[value],
  })),
] as const;

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
  if (!status) return "/withdraw";
  const params = new URLSearchParams({ status });
  return `/withdraw?${params.toString()}`;
}

/**
 * Write (or clear) the `status` query param while preserving other params.
 * Returns the path to pass to `router.replace`.
 */
export function withdrawPathWithStatus(
  currentSearch: string | URLSearchParams,
  status: WithdrawStatusFilter | undefined,
): string {
  const params =
    typeof currentSearch === "string"
      ? new URLSearchParams(
          currentSearch.startsWith("?")
            ? currentSearch.slice(1)
            : currentSearch,
        )
      : new URLSearchParams(currentSearch);
  if (status) params.set("status", status);
  else params.delete("status");
  const qs = params.toString();
  return qs ? `/withdraw?${qs}` : "/withdraw";
}

/** True when the URL has a `status` value that is not a known filter. */
export function hasInvalidWithdrawStatusParam(
  value: string | null | undefined,
): boolean {
  const raw = value?.trim();
  if (!raw) return false;
  return parseWithdrawStatusFilter(raw) === undefined;
}
