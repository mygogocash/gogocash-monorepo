/**
 * Builds the conversion "description" line from its adv_sub parameters.
 * Empty/blank parts are dropped so the line never shows dangling separators.
 */
export function conversionAdvSummary(row: {
  adv_sub1?: unknown;
  adv_sub2?: unknown;
  adv_sub3?: unknown;
  adv_sub4?: unknown;
}): string {
  return [row.adv_sub1, row.adv_sub2, row.adv_sub3, row.adv_sub4]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean)
    .join(" , ");
}

/**
 * The user's net cashback for a conversion, shown in the "User Earning" column.
 *
 * Normal conversions: gross payout minus the system fee (payout − payout × fee/100),
 * clamped at 0 — matching `totalsByStatusAndCurrency` on the backend.
 *
 * Manually-added "Extra cashback" credits (admin → wallet) carry NO fee, so the
 * user earns the full payout — User Earning equals Total Payout for them.
 */
export function conversionUserEarning(row: {
  payout?: number | string | null;
  systemFeePct?: number | string | null;
  offer_name?: string | null;
}): number {
  const gross = Number(row?.payout ?? 0);
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  if (row?.offer_name === "Extra cashback") return gross;
  const feePct = Number(row?.systemFeePct ?? 0);
  if (!Number.isFinite(feePct)) return 0;
  const net = gross - gross * (feePct / 100);
  return net > 0 ? net : 0;
}

/** GoGoCash's fee rate applied to a conversion's gross payout (30%). */
const GGC_FEE_RATE = 0.3;

/**
 * GoGoCash's earning on a conversion, shown in the "GGC Earning" column:
 * a flat 30% fee of the gross payout, clamped at 0.
 */
export function conversionGgcEarning(row: {
  payout?: number | string | null;
}): number {
  const gross = Number(row?.payout ?? 0);
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross * GGC_FEE_RATE;
}
