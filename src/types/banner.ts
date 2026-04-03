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

/** API payload for `/admin/banner-home` — no `end_forever` (derived from `end_date`). */
export type BannerData = Omit<BannerRequestForm, "id" | "end_forever">;