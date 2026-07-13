/**
 * Cashback tracking-period resolution — the single source of truth for the
 * customer-facing "Tracking within N day / Confirm within N day" windows.
 *
 * Modes (offer.tracking_period_mode, default 'auto'):
 * - auto:   confirm window mirrors the partner feed's validation_terms (the
 *           Involve days-to-validate figure, refreshed on every feed sync);
 *           tracking window is the platform default — Involve has no
 *           tracking-window field (payment_terms is payout timing, not
 *           tracking).
 * - manual: admin-entered day counts from the Brands panel.
 *
 * Day counts are only trusted when they are integers in [1, 365]; anything
 * else (0 means "unset" on partner feeds, like commission_store) falls back
 * to the defaults.
 */

export const DEFAULT_TRACKING_DAYS = 30;
export const DEFAULT_CONFIRM_DAYS = 30;

export const MIN_TRACKING_PERIOD_DAYS = 1;
export const MAX_TRACKING_PERIOD_DAYS = 365;

export type TrackingPeriodSource = 'partner' | 'manual' | 'default';

export type ResolvedTrackingPeriod = {
  tracking_days: number;
  confirm_days: number;
  source: TrackingPeriodSource;
};

export type TrackingPeriodFields = {
  tracking_period_mode?: string;
  tracking_days?: number;
  confirm_days?: number;
  validation_terms?: number;
};

export function isValidDayCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_TRACKING_PERIOD_DAYS &&
    value <= MAX_TRACKING_PERIOD_DAYS
  );
}

export function resolveTrackingPeriod(
  offer: TrackingPeriodFields,
): ResolvedTrackingPeriod {
  if (offer.tracking_period_mode === 'manual') {
    return {
      tracking_days: isValidDayCount(offer.tracking_days)
        ? offer.tracking_days
        : DEFAULT_TRACKING_DAYS,
      confirm_days: isValidDayCount(offer.confirm_days)
        ? offer.confirm_days
        : DEFAULT_CONFIRM_DAYS,
      source: 'manual',
    };
  }

  const partnerConfirm = isValidDayCount(offer.validation_terms)
    ? offer.validation_terms
    : null;
  return {
    tracking_days: DEFAULT_TRACKING_DAYS,
    confirm_days: partnerConfirm ?? DEFAULT_CONFIRM_DAYS,
    source: partnerConfirm !== null ? 'partner' : 'default',
  };
}
