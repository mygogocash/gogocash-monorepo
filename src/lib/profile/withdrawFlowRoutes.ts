/**
 * Withdraw UX flows (Figma GoGoCash 1.1).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1 — nodes referenced in comments below.
 */

/** Figma node 9091-197199 — user must add citizen ID + legal address */
export const WITHDRAW_FLOW_COLLECT_IDENTITY = "collect_identity";

/** Figma node 9091-197559 — review & confirm withdrawal (after KYC complete) */
export const WITHDRAW_FLOW_READY = "withdraw_ready";

export function getProfileWithdrawKycIncompletePath(): string {
  return `/profile/info?from=withdraw&flow=${WITHDRAW_FLOW_COLLECT_IDENTITY}`;
}

export function getWithdrawReadyQuery(): string {
  return `flow=${WITHDRAW_FLOW_READY}`;
}
