export type OfferDisplayTags = {
  brand_category_enabled: boolean;
  brand_category_label: string;
  extra_cashback_tag: boolean;
  grab_coupon_tag: boolean;
  expire_in_days_enabled: boolean;
  expire_in_days: number | null;
};

export const DEFAULT_OFFER_DISPLAY_TAGS: OfferDisplayTags = {
  brand_category_enabled: false,
  brand_category_label: '',
  extra_cashback_tag: false,
  grab_coupon_tag: false,
  expire_in_days_enabled: false,
  expire_in_days: null,
};

export function normalizeOfferDisplayTags(value: unknown): OfferDisplayTags {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_OFFER_DISPLAY_TAGS };
  }
  const o = value as Record<string, unknown>;
  const rawDays = o.expire_in_days;
  let expire: number | null = null;
  if (rawDays !== '' && rawDays != null && !Number.isNaN(Number(rawDays))) {
    const n = Math.floor(Number(rawDays));
    if (n >= 1) expire = n;
  }
  return {
    brand_category_enabled: Boolean(o.brand_category_enabled),
    brand_category_label: String(o.brand_category_label ?? '').trim(),
    extra_cashback_tag: Boolean(o.extra_cashback_tag),
    grab_coupon_tag: Boolean(o.grab_coupon_tag),
    expire_in_days_enabled: Boolean(o.expire_in_days_enabled),
    expire_in_days: expire,
  };
}

/** Parse multipart `offer_display_tags` JSON; undefined preserves existing on update. */
export function parseOfferDisplayTagsField(
  value: unknown,
): OfferDisplayTags | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      return normalizeOfferDisplayTags(JSON.parse(trimmed) as unknown);
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return normalizeOfferDisplayTags(value);
  }
  return undefined;
}
