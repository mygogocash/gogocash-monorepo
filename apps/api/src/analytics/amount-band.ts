/**
 * Bucket a money amount into a coarse range for analytics.
 *
 * PDPA-safe by design: exact withdraw/payout amounts are never sent to
 * PostHog — only the band. Non-finite or negative inputs collapse to
 * 'unknown' so a raw value can't leak through an unexpected path.
 */
export function amountBand(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
    return 'unknown';
  }
  if (amount < 100) return '0-100';
  if (amount < 500) return '100-500';
  if (amount < 1000) return '500-1000';
  if (amount < 5000) return '1000-5000';
  return '5000+';
}
