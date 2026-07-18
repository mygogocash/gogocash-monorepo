import type { OfferDisplayTags as OfferDisplayTagsContract } from "@gogocash/contracts";

// Defensive partial of the canonical contract (#19 P4-1): the customer app
// types only the fields it consumes and treats them all as optional, but the
// field names/types are derived from @gogocash/contracts so they cannot drift.
export type OfferDisplayTags = Partial<
  Pick<OfferDisplayTagsContract, "brand_category_enabled" | "brand_category_label">
>;

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
