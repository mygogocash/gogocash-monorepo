import type { BannerSlotId, BannerTableVariant } from "@/types/banner";

export type BannerSlotDescriptor = {
  area: string;
  label: string;
  slot: BannerSlotId;
};

const HOME_SLOT_DESCRIPTORS: readonly BannerSlotDescriptor[] = [
  {
    area: "Top homepage sliding carousel",
    label: "Top carousel slide No. 1",
    slot: 1,
  },
  {
    area: "Top homepage sliding carousel",
    label: "Top carousel slide No. 2",
    slot: 2,
  },
  {
    area: "Top homepage sliding carousel",
    label: "Top carousel slide No. 3",
    slot: 3,
  },
  {
    area: "Below the carousel, left position",
    label: "Lower small banner No. 1 (left)",
    slot: 4,
  },
  {
    area: "Below the carousel, right position",
    label: "Lower small banner No. 2 (right)",
    slot: 5,
  },
];

const SPECIFIC_PAGE_SLOT_DESCRIPTORS: readonly BannerSlotDescriptor[] = [
  1, 2, 3,
].map((slot) => ({
  area: "All Brands page carousel",
  label: `Slide No. ${slot}`,
  slot: slot as BannerSlotId,
}));

/**
 * Admin-facing slot names for each persisted banner surface.
 *
 * `homeSmall` remains in the legacy type union, but deliberately exposes no
 * positions because the live banner page does not render that mock-only surface.
 */
export function getBannerSlotDescriptors(
  variant: BannerTableVariant,
): readonly BannerSlotDescriptor[] {
  if (variant === "home") return HOME_SLOT_DESCRIPTORS;
  if (variant === "allBrand") return SPECIFIC_PAGE_SLOT_DESCRIPTORS;
  return [];
}
