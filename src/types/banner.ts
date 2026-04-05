/** Which homepage / brands banner admin surface is being edited (tables + mock paths). */
export type BannerTableVariant = "home" | "homeSmall" | "allBrand";

export interface BannerRequestForm {
  image_1: File | null;
  image_2: File | null;
  image_3: File | null;
  image_4: File | null;
  image_5: File | null;
  link_1: string;
  link_2: string;
  link_3: string;
  link_4: string;
  link_5: string;
  start_date: string;
  end_date: string;
  /** UI + save: when true, no `end_date` is sent (same as legacy blank = no end). */
  end_forever: boolean;
  id: string;
}

/**
 * API payload for banner slot APIs (`/admin/banner-home`, `/admin/banner-home-small`,
 * `/admin/banner-all-brand-page`). No `end_forever` (derived from `end_date`).
 */
export type BannerData = Omit<BannerRequestForm, "id" | "end_forever">;