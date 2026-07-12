/**
 * Admin-side ADVISORY preview of the cashback tracking period.
 *
 * The customer-facing truth is resolved by the API
 * (apps/api/src/offer/tracking-period.util.ts — resolveTrackingPeriod) and
 * served as `tracking_period` on GET /offer/:id. This file is a deliberately
 * tiny mirror (same 30/30 defaults, same 1–365 validity rule) used ONLY for
 * the read-mode preview inside the Brands form; keep the two in sync.
 */

export const DEFAULT_TRACKING_DAYS = 30;
export const DEFAULT_CONFIRM_DAYS = 30;
export const MIN_TRACKING_PERIOD_DAYS = 1;
export const MAX_TRACKING_PERIOD_DAYS = 365;

export type TrackingPeriodSource = "partner" | "manual" | "default";

export type TrackingPeriodPreview = {
  tracking_days: number;
  confirm_days: number;
  source: TrackingPeriodSource;
};

export type TrackingPeriodOfferFields = {
  tracking_period_mode?: string | null;
  tracking_days?: number | null;
  confirm_days?: number | null;
  validation_terms?: number | null;
};

export function isValidTrackingDayCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TRACKING_PERIOD_DAYS &&
    value <= MAX_TRACKING_PERIOD_DAYS
  );
}

export function resolveTrackingPeriodPreview(
  offer: TrackingPeriodOfferFields,
  // The /brands/[id] route loads offers via the public detail endpoint, which
  // strips raw validation_terms but attaches the API-derived tracking_period —
  // use it so the auto preview still shows the true partner window there.
  derivedFallback?: {
    tracking_days: number;
    confirm_days: number;
    source: string;
  } | null,
): TrackingPeriodPreview {
  if (offer.tracking_period_mode === "manual") {
    return {
      tracking_days: isValidTrackingDayCount(offer.tracking_days)
        ? offer.tracking_days
        : DEFAULT_TRACKING_DAYS,
      confirm_days: isValidTrackingDayCount(offer.confirm_days)
        ? offer.confirm_days
        : DEFAULT_CONFIRM_DAYS,
      source: "manual",
    };
  }

  const partnerConfirm = isValidTrackingDayCount(offer.validation_terms)
    ? offer.validation_terms
    : derivedFallback?.source === "partner" &&
        isValidTrackingDayCount(derivedFallback.confirm_days)
      ? derivedFallback.confirm_days
      : null;
  return {
    tracking_days: DEFAULT_TRACKING_DAYS,
    confirm_days: partnerConfirm ?? DEFAULT_CONFIRM_DAYS,
    source: partnerConfirm !== null ? "partner" : "default",
  };
}

/** Customer copy parity: the app renders exactly `within ${n} day`. */
export function formatTrackingDays(days: number): string {
  return `within ${days} day`;
}
