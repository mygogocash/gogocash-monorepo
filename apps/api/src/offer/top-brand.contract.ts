export const MAX_TOP_BRANDS = 16;

type OfferCashbackSource = {
  commission_store?: unknown;
  commissions?: unknown;
};

function parsePercent(value: unknown): number | null {
  if (value == null) return null;
  const match = String(value)
    .trim()
    .match(/([\d.]+)\s*%/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function bestPartnerPercent(commissions: unknown): number {
  if (!Array.isArray(commissions)) return 0;

  let best = 0;
  for (const row of commissions) {
    const values =
      row != null && typeof row === 'object' && !Array.isArray(row)
        ? Object.values(row as Record<string, unknown>)
        : [row];
    for (const value of values) {
      const percent = parsePercent(value);
      if (percent != null) best = Math.max(best, percent);
    }
  }
  return best;
}

function formatPercent(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return `${rounded}%`;
}

/**
 * Resolve the customer-facing rate from live offer economics.
 *
 * `commission_store` is already the customer's configured rate. When it is
 * absent, partner commission data is reduced by the platform's default 30%
 * share, matching the admin offer preview calculation.
 */
export function resolveOfferCashbackLabel(
  offer: OfferCashbackSource | null | undefined,
): string {
  if (!offer) return '';

  const storeRate = Number(
    String(offer.commission_store ?? '').replace(/%/g, ''),
  );
  if (Number.isFinite(storeRate) && storeRate > 0) {
    return formatPercent(storeRate);
  }

  const partnerRate = bestPartnerPercent(offer.commissions);
  return partnerRate > 0 ? formatPercent(partnerRate * 0.7) : '';
}
