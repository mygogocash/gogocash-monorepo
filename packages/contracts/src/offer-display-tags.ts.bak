/**
 * Admin-controlled offer card / listing tags (app merchandising).
 *
 * Canonical contract shared by the API (types only), admin, and the customer
 * app (issue #19, P4-1). The API keeps its own runtime copy of
 * `normalizeOfferDisplayTags` in `apps/api/src/offer/offer-display-tags.util.ts`
 * because its SWC-built runtime never loads this source package — behavioral
 * parity between the two is enforced by
 * `apps/api/src/offer/offer-display-tags.contract-parity.spec.ts`.
 */
export interface OfferDisplayTags {
  /** Show a "brand category" style tag. */
  brand_category_enabled: boolean;
  /** System category name from Category Management list, or empty to use partner `categories`. */
  brand_category_label: string;
  extra_cashback_tag: boolean;
  grab_coupon_tag: boolean;
  /** When true, show "Expire in {n} days" using `expire_in_days`. */
  expire_in_days_enabled: boolean;
  expire_in_days: number | null;
}

export const DEFAULT_OFFER_DISPLAY_TAGS: OfferDisplayTags = {
  brand_category_enabled: false,
  brand_category_label: "",
  extra_cashback_tag: false,
  grab_coupon_tag: false,
  expire_in_days_enabled: false,
  expire_in_days: null,
};

export function normalizeOfferDisplayTags(value: unknown): OfferDisplayTags {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_OFFER_DISPLAY_TAGS };
  }
  const o = value as Record<string, unknown>;
  const rawDays = o.expire_in_days;
  let expire: number | null = null;
  if (rawDays !== "" && rawDays != null && !Number.isNaN(Number(rawDays))) {
    const n = Math.floor(Number(rawDays));
    if (n >= 1) expire = n;
  }
  return {
    brand_category_enabled: Boolean(o.brand_category_enabled),
    brand_category_label: String(o.brand_category_label ?? "").trim(),
    extra_cashback_tag: Boolean(o.extra_cashback_tag),
    grab_coupon_tag: Boolean(o.grab_coupon_tag),
    expire_in_days_enabled: Boolean(o.expire_in_days_enabled),
    expire_in_days: expire,
  };
}
