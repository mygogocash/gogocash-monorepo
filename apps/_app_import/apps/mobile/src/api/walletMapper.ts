import type { CheckWithdrawResponse } from "@mobile/api/walletTypes";

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

function formatThb(amount: number): string {
  const safe = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return safe.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

/**
 * Money rule: in live mode every amount is backend-derived or zero — fixture
 * demo numbers must never render as a real balance. The endpoint only exposes
 * net/approved totals today, so the pending and withdrawn rows are zero until
 * a backing source exists.
 */
export function mapCheckWithdrawToWalletMetrics(
  response: CheckWithdrawResponse,
  fixtureMetrics: WalletMetricFixture
): WalletMetricView[] {
  return fixtureMetrics.map((metric, index) => ({
    amount: index === 0 ? formatThb(response.netAmountTHB) : "0.00",
    currency: metric.currency,
    hint: metric.hint,
    label: metric.label,
    primary: metric.primary,
  }));
}
