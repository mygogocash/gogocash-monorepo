import { isDirty } from "@/lib/isDirty";
import {
  normalizeOfferDisplayTags,
  type OfferDisplayTags,
} from "@/types/api";

export type BrandSectionEditValues = {
  offer_name_display: string;
  lookup_value: string;
  disabled: boolean;
  extra_store: boolean;
  offer_display_tags: OfferDisplayTags;
  syncLookup: boolean;
};

export function normalizeBrandSectionEditValues(
  values: BrandSectionEditValues,
): BrandSectionEditValues {
  return {
    ...values,
    offer_name_display: values.offer_name_display.trim(),
    lookup_value: values.lookup_value.trim(),
    offer_display_tags: normalizeOfferDisplayTags(values.offer_display_tags),
  };
}

export function isBrandSectionDirty(
  current: BrandSectionEditValues,
  snapshot: BrandSectionEditValues | null,
): boolean {
  if (!snapshot) return false;
  return isDirty(
    normalizeBrandSectionEditValues(current),
    normalizeBrandSectionEditValues(snapshot),
  );
}

export function brandSectionSaveBlockedMessage(
  offerNameDisplay: string,
): string | null {
  if (!offerNameDisplay.trim()) {
    return "Enter a display name for this offer before saving.";
  }
  return null;
}
