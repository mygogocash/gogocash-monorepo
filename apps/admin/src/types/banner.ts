export type SpecificPageBannerTargetId =
  "all-brands" | "all-shops" | "product-discovery";

/** Persisted banner surface selected by the shared Admin table/editor. */
export type BannerAdminSurfaceId =
  "home" | "homeSmall" | SpecificPageBannerTargetId;

/** Backward-compatible name retained for imports while BannerTable moves to surface ids. */
export type BannerTableVariant = BannerAdminSurfaceId;

export const BANNER_SLOT_IDS = [1, 2, 3, 4, 5] as const;

export type BannerSlotId = (typeof BANNER_SLOT_IDS)[number];

export type BannerSlotDescriptor = {
  area: string;
  label: string;
  slot: BannerSlotId;
};

type SlotSuffix = `_${BannerSlotId}`;

type SlotImageFields = {
  [K in BannerSlotId as `image${SlotSuffix}`]: File | string | null;
};

type SlotLinkFields = {
  [K in BannerSlotId as `link${SlotSuffix}`]: string;
};

type SlotEnabledFields = {
  [K in BannerSlotId as `enabled${SlotSuffix}`]: boolean;
};

type SlotDateFields = {
  [K in BannerSlotId as `start_date${SlotSuffix}`]: string;
} & {
  [K in BannerSlotId as `end_date${SlotSuffix}`]: string;
};

type SlotForeverFields = {
  [K in BannerSlotId as `end_forever_${K}`]: boolean;
};

export interface BannerRequestForm
  extends
    SlotImageFields,
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
  SlotLinkFields & {
    [K in BannerSlotId as `enabled${SlotSuffix}`]?: boolean | null;
  } & {
    [K in BannerSlotId as `start_date${SlotSuffix}`]?: string | null;
  } & {
    [K in BannerSlotId as `end_date${SlotSuffix}`]?: string | null;
  };
