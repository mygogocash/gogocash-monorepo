/**
 * Admin-side ADVISORY preview of the cashback tracking period.
 *
 * The customer-facing truth is resolved by the API
 * (apps/api/src/offer/tracking-period.util.ts — resolveTrackingPeriod) and
 * served as `tracking_period` on GET /offer/:id. This file is a deliberately
 * tiny mirror (same 30/30 defaults, same 1–365 validity rule, same
 * three_step/two_step flow + subtitle defaults) used ONLY for the read-mode
 * preview inside the Brands form; keep the two in sync.
 */

export const DEFAULT_TRACKING_DAYS = 30;
export const DEFAULT_CONFIRM_DAYS = 30;
export const MIN_TRACKING_PERIOD_DAYS = 1;
export const MAX_TRACKING_PERIOD_DAYS = 365;

export const DEFAULT_FLOW_TYPE = "three_step";
export const DEFAULT_TRACKING_SUBTITLE = "from the following month";
export const DEFAULT_CONFIRM_SUBTITLE = "after validation";

export type TrackingPeriodSource = "partner" | "manual" | "default";

export type TrackingPeriodFlowType = "three_step" | "two_step";

export type TrackingPeriodPreview = {
  tracking_days: number;
  confirm_days: number;
  source: TrackingPeriodSource;
  flow_type: TrackingPeriodFlowType;
  tracking_subtitle: string;
  confirm_subtitle: string;
};

export type TrackingPeriodOfferFields = {
  tracking_period_mode?: string | null;
  tracking_days?: number | null;
  confirm_days?: number | null;
  validation_terms?: number | null;
  flow_type?: string | null;
  tracking_subtitle?: string | null;
  confirm_subtitle?: string | null;
};

export function isValidTrackingDayCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TRACKING_PERIOD_DAYS &&
    value <= MAX_TRACKING_PERIOD_DAYS
  );
}

/**
 * Normalize the manual editor into the API's existing two-number contract.
 *
 * The customer two-step flow consumes `confirm_days` as its one combined
 * window. A valid hidden `tracking_days` value is retained for a later switch
 * back to three-step; a newly created two-step offer mirrors the combined
 * value into that hidden field so both API day-count invariants remain valid.
 */
export function resolveManualTrackingPeriodDays(fields: {
  flow_type: TrackingPeriodFlowType;
  tracking_days: number | null | undefined;
  confirm_days: number | null | undefined;
}): { tracking_days: number; confirm_days: number } | null {
  if (!isValidTrackingDayCount(fields.confirm_days)) {
    return null;
  }
  if (fields.flow_type === "two_step") {
    return {
      tracking_days: isValidTrackingDayCount(fields.tracking_days)
        ? fields.tracking_days
        : fields.confirm_days,
      confirm_days: fields.confirm_days,
    };
  }
  if (!isValidTrackingDayCount(fields.tracking_days)) {
    return null;
  }
  return {
    tracking_days: fields.tracking_days,
    confirm_days: fields.confirm_days,
  };
}

function resolveFlowType(value: unknown): TrackingPeriodFlowType {
  return value === "two_step" ? "two_step" : DEFAULT_FLOW_TYPE;
}

/** Stored trimmed non-empty subtitle wins; anything else is the default copy. */
function resolveSubtitle(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
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

  if (offer.tracking_period_mode === "manual") {
    return {
      tracking_days: isValidTrackingDayCount(offer.tracking_days)
        ? offer.tracking_days
        : DEFAULT_TRACKING_DAYS,
      confirm_days: isValidTrackingDayCount(offer.confirm_days)
        ? offer.confirm_days
        : DEFAULT_CONFIRM_DAYS,
      source: "manual",
      ...flowFields,
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
    ...flowFields,
  };
}

/** Customer copy parity: the app renders exactly `within ${n} day`. */
export function formatTrackingDays(days: number): string {
  return `within ${days} day`;
}
