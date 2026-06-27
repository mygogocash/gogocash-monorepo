type CommissionRow = Record<string, unknown> | string | number | null;

function parseCommissionPercentString(value: unknown): number | null {
  if (value == null) return null;
  const str = typeof value === 'string' ? value : String(value);
  const match = str.trim().match(/([\d.]+)\s*%/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Best partner % from Involve-style commission rows or string arrays. */
export function bestPercentFromPartnerRates(
  commissions: CommissionRow[],
): number {
  let max = 0;
  for (const row of commissions) {
    if (row != null && typeof row === 'object' && !Array.isArray(row)) {
      for (const value of Object.values(row as Record<string, unknown>)) {
        const percent = parseCommissionPercentString(value);
        if (percent != null && percent > max) max = percent;
      }
    } else {
      const percent = parseCommissionPercentString(row);
      if (percent != null && percent > max) max = percent;
    }
  }
  return max;
}

export function formatPartnerRateLabels(
  commissions: CommissionRow[],
): string[] {
  const labels: string[] = [];
  for (const row of commissions) {
    if (row != null && typeof row === 'object' && !Array.isArray(row)) {
      for (const value of Object.values(row as Record<string, unknown>)) {
        const text = String(value ?? '').trim();
        if (text) labels.push(text);
      }
    } else {
      const text = String(row ?? '').trim();
      if (text) labels.push(text);
    }
  }
  return labels;
}

export function buildSuggestedAppDeeplink(input: {
  offerId: string;
  lookupValue: string;
  currency: string;
  commissions: CommissionRow[];
  commissionStore?: number | null;
  affiliateNetworkId: string;
  bestRatePercent: number;
}): string {
  const safeLookup = encodeURIComponent(
    input.lookupValue.trim() || input.offerId,
  );
  const params = new URLSearchParams();
  params.set('bestRate', String(input.bestRatePercent));
  params.set('currency', input.currency || 'THB');
  params.set('affNetwork', input.affiliateNetworkId.trim() || 'involve_asia');
  return `https://gogocash.app/open/offer/${safeLookup}?${params.toString()}`;
}
