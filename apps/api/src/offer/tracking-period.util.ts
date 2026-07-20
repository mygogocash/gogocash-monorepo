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

import { BadRequestException } from '@nestjs/common';

export const DEFAULT_TRACKING_DAYS = 30;
export const DEFAULT_CONFIRM_DAYS = 30;

export const MIN_TRACKING_PERIOD_DAYS = 1;
export const MAX_TRACKING_PERIOD_DAYS = 365;

/**
 * Admin-supplied day count from a write path (create or update). Absent/blank
 * means "not supplied" -> undefined, so the schema default applies. Anything
 * supplied but outside [1, 365] or non-integer is a 400: an admin who typed a
 * number must never be told the save succeeded while their value was quietly
 * swapped for a default.
 *
 * Shared by the admin update controller and admin offer creation so the two
 * write paths cannot drift apart on what counts as a valid window.
 */
export function coerceOptionalDayCount(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized || normalized === 'undefined') return undefined;
    value = Number(normalized);
  }
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_TRACKING_PERIOD_DAYS ||
    value > MAX_TRACKING_PERIOD_DAYS
  ) {
    throw new BadRequestException(
      `Invalid ${label}: expected a whole number of days between ${MIN_TRACKING_PERIOD_DAYS} and ${MAX_TRACKING_PERIOD_DAYS}`,
    );
  }
  return value;
}

/**
 * Flow shape of the customer strip: 'three_step' renders Purchase → Tracking →
 * Confirm; 'two_step' collapses the last two into a combined "Tracking and
 * confirm" step. Editable per-step subtitles default to the copy below.
 */
const DEFAULT_FLOW_TYPE = 'three_step';
const DEFAULT_TRACKING_SUBTITLE = 'from the following month';
const DEFAULT_CONFIRM_SUBTITLE = 'after validation';

export type TrackingPeriodSource = 'partner' | 'manual' | 'default';

export type TrackingPeriodFlowType = 'three_step' | 'two_step';

export type ResolvedTrackingPeriod = {
  tracking_days: number;
  confirm_days: number;
  source: TrackingPeriodSource;
  flow_type: TrackingPeriodFlowType;
  tracking_subtitle: string;
  confirm_subtitle: string;
};

export type TrackingPeriodFields = {
  tracking_period_mode?: string;
  tracking_days?: number;
  confirm_days?: number;
  validation_terms?: number;
  flow_type?: string;
  tracking_subtitle?: string;
  confirm_subtitle?: string;
};

function isValidDayCount(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_TRACKING_PERIOD_DAYS &&
    value <= MAX_TRACKING_PERIOD_DAYS
  );
}

function resolveFlowType(value: unknown): TrackingPeriodFlowType {
  return value === 'two_step' ? 'two_step' : DEFAULT_FLOW_TYPE;
}

/** Stored trimmed non-empty subtitle wins; anything else is the default copy. */
function resolveSubtitle(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

export function resolveTrackingPeriod(
  offer: TrackingPeriodFields,
): ResolvedTrackingPeriod {
  const flowFields = {
    flow_type: resolveFlowType(offer.flow_type),
    tracking_subtitle: resolveSubtitle(
      offer.tracking_subtitle,
      DEFAULT_TRACKING_SUBTITLE,
    ),
    confirm_subtitle: resolveSubtitle(
      offer.confirm_subtitle,
      DEFAULT_CONFIRM_SUBTITLE,
    ),
  };

  if (offer.tracking_period_mode === 'manual') {
    return {
      tracking_days: isValidDayCount(offer.tracking_days)
        ? offer.tracking_days
        : DEFAULT_TRACKING_DAYS,
      confirm_days: isValidDayCount(offer.confirm_days)
        ? offer.confirm_days
        : DEFAULT_CONFIRM_DAYS,
      source: 'manual',
      ...flowFields,
    };
  }

  const partnerConfirm = isValidDayCount(offer.validation_terms)
    ? offer.validation_terms
    : null;
  return {
    tracking_days: DEFAULT_TRACKING_DAYS,
    confirm_days: partnerConfirm ?? DEFAULT_CONFIRM_DAYS,
    source: partnerConfirm !== null ? 'partner' : 'default',
    ...flowFields,
  };
}
