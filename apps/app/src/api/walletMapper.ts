import type { CheckWithdrawResponse } from "@mobile/api/walletTypes";
import { isListCheckResponse } from "@mobile/api/walletTransactions";

// Matches the wallet summary fixture's metric rows (label/hint/currency are
// design copy; only amounts go live).
export type WalletMetricView = {
  amount: string;
  currency: string;
  hint: string;
  label: string;
  primary: boolean;
};

type WalletMetricFixture = ReadonlyArray<
  Omit<WalletMetricView, "amount"> & { amount: string }
>;

export type WalletMetricExtras = {
  /** Pending earning cashback converted to THB (from list-check). */
  pendingAmountTHB?: number;
  /** Approved/paid withdrawals converted to THB (from list-check). */
  withdrawnAmountTHB?: number;
};

function formatThb(amount: number): string {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return safe.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/** Same vocabulary as wallet tx rows — pending = not success and not failed. */
function isPendingConversionStatus(status: string): boolean {
  const s = status.toLowerCase();
  if (s === "approved" || s === "paid") return false;
  if (s === "rejected" || s === "failed" || s === "cancelled") return false;
  return true;
}

/**
 * Pull Pending Cashback (earn) + Withdrawn totals in THB from
 * POST /withdraw/list-check aggregates. FX is already applied server-side.
 */
export function resolveWalletListCheckMetricExtras(
  payload: unknown,
): WalletMetricExtras {
  if (!isListCheckResponse(payload)) return {};

  const rows = Array.isArray(payload.totalsByStatusAndCurrency)
    ? payload.totalsByStatusAndCurrency
    : [];

  let pendingAmountTHB = 0;
  for (const row of rows) {
    if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
    const status = typeof row.status === "string" ? row.status : "";
    if (!isPendingConversionStatus(status)) continue;
    pendingAmountTHB += num(row.totalTHB);
  }

  const withdrawn = payload.withdrawSumThbApproved;
  const withdrawnAmountTHB =
    withdrawn != null && typeof withdrawn === "object" && !Array.isArray(withdrawn)
      ? num((withdrawn as { netAmount?: unknown }).netAmount)
      : 0;

  return { pendingAmountTHB, withdrawnAmountTHB };
}

/**
 * Money rule: in live mode every amount is backend-derived or zero — fixture
 * demo numbers must never render as a real balance.
 *
 * - Total Cashback → `/withdraw/check` `netAmountTHB`
 * - Pending Cashback → list-check `totalsByStatusAndCurrency` pending `totalTHB`
 * - Withdrawn → list-check `withdrawSumThbApproved.netAmount`
 */
export function mapCheckWithdrawToWalletMetrics(
  response: CheckWithdrawResponse,
  fixtureMetrics: WalletMetricFixture,
  extras: WalletMetricExtras = {},
): WalletMetricView[] {
  const pending = extras.pendingAmountTHB ?? 0;
  const withdrawn = extras.withdrawnAmountTHB ?? 0;

  return fixtureMetrics.map((metric, index) => {
    let amount = "0.00";
    if (index === 0 || /total\s*cashback/i.test(metric.label)) {
      amount = formatThb(response.netAmountTHB);
    } else if (index === 1 || /pending\s*cashback/i.test(metric.label)) {
      amount = formatThb(pending);
    } else if (index === 2 || /withdrawn/i.test(metric.label)) {
      amount = formatThb(withdrawn);
    }

    return {
      amount,
      currency: metric.currency,
      hint: metric.hint,
      label: metric.label,
      primary: metric.primary,
    };
  });
}
