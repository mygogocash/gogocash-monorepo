/**
 * Cashback total derivations for the user withdraw/finance view.
 *
 * Structural input types (kept decoupled from the full withdraw API type so the
 * math is unit-testable in isolation). The real `ResDataWithdrawsListByUser`
 * rows are assignable to these shapes.
 */
export interface ApprovedTotalRow {
  status: string;
  totalTHB?: number | null;
}

export interface WithdrawRow {
  status: string;
  amount_net?: number | null;
}

export interface CashbackTotalsInput {
  totalsByStatusAndCurrency?: readonly ApprovedTotalRow[] | null;
  withdrawList?: readonly WithdrawRow[] | null;
}

/**
 * Total earned cashback = cashback currently held (approved conversion
 * cashback, a.k.a. the "GoGoCash Wallet" figure) + everything already withdrawn
 * (net of fees, approved withdrawals — the "Total Withdrawn" figure).
 */
export function totalEarnedCashback(
  detail: CashbackTotalsInput | null | undefined,
): number {
  const approved =
    detail?.totalsByStatusAndCurrency?.find((row) => row.status === "approved")
      ?.totalTHB ?? 0;
  const withdrawn =
    detail?.withdrawList
      ?.filter((row) => row.status === "approved")
      .reduce((sum, row) => sum + (row.amount_net ?? 0), 0) ?? 0;
  return approved + withdrawn;
}
