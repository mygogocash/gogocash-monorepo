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
