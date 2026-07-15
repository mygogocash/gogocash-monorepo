export type OfferDisplayTags = {
  brand_category_enabled?: boolean;
  brand_category_label?: string;
};

export type OfferDisplayCategorySource = {
  categories?: string;
  offer_display_tags?: OfferDisplayTags | null;
};

/**
 * Customer category precedence:
 * 1. an explicitly enabled, non-empty admin override;
 * 2. the partner-feed category snapshot;
 * 3. the caller's surface-specific fallback.
 */
export function resolveOfferDisplayCategory(
  offer: OfferDisplayCategorySource,
  fallback: string,
): string {
  const override = offer.offer_display_tags?.brand_category_label?.trim();
  if (offer.offer_display_tags?.brand_category_enabled === true && override) {
    return override;
  }

  return offer.categories?.trim() || fallback;
}
