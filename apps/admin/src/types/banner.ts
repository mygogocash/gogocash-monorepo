/** Which homepage / brands banner admin surface is being edited (tables + mock paths). */
export type BannerTableVariant = "home" | "homeSmall" | "allBrand";

export const BANNER_SLOT_IDS = [1, 2, 3, 4, 5] as const;

export type BannerSlotId = (typeof BANNER_SLOT_IDS)[number];

type SlotSuffix = `_${BannerSlotId}`;

const slotImageKey = (slot: BannerSlotId): `image${SlotSuffix}` =>
  `image_${slot}`;
const slotLinkKey = (slot: BannerSlotId): `link${SlotSuffix}` =>
  `link_${slot}`;
const slotEnabledKey = (slot: BannerSlotId): `enabled${SlotSuffix}` =>
  `enabled_${slot}`;
const slotStartDateKey = (slot: BannerSlotId): `start_date${SlotSuffix}` =>
  `start_date_${slot}`;
const slotEndDateKey = (slot: BannerSlotId): `end_date${SlotSuffix}` =>
  `end_date_${slot}`;

type SlotImageFields = {
  [K in BannerSlotId as ReturnType<typeof slotImageKey>]: File | string | null;
};

type SlotLinkFields = {
  [K in BannerSlotId as ReturnType<typeof slotLinkKey>]: string;
};

type SlotEnabledFields = {
  [K in BannerSlotId as ReturnType<typeof slotEnabledKey>]: boolean;
};

type SlotDateFields = {
  [K in BannerSlotId as ReturnType<typeof slotStartDateKey>]: string;
} & {
  [K in BannerSlotId as ReturnType<typeof slotEndDateKey>]: string;
};

type SlotForeverFields = {
  [K in BannerSlotId as `end_forever_${K}`]: boolean;
};

export interface BannerRequestForm
  extends SlotImageFields,
    SlotLinkFields,
    SlotEnabledFields,
    SlotDateFields,
    SlotForeverFields {
  id: string;
}

/**
 * API payload for banner slot APIs (`/admin/banner-home`, `/admin/banner-home-small`,
 * `/admin/banner-all-brand-page`). No `end_forever` (derived from `end_date`).
 */
export type BannerData = {
  /** Legacy API fields (legacy backend clients still may return these). */
  start_date?: string;
  end_date?: string;
} & SlotImageFields &
  SlotLinkFields &
  {
    [K in ReturnType<typeof slotEnabledKey>]?: boolean | null;
  } & {
    [K in ReturnType<typeof slotStartDateKey>]?: string | null;
  } & {
    [K in ReturnType<typeof slotEndDateKey>]?: string | null;
  };
