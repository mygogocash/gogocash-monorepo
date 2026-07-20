import type { CategoryIconKey } from "@/components/policy/CategoryIcon";

export interface ResCategoryList {
  _id: string;
  name: string;
  image?: string;
  /** Wide hero / header image for this category (optional). */
  banner?: string;
  icon_key?: CategoryIconKey;
  name_normalized?: string;
  lifecycle_status?: "active" | "retired" | "purging";
  revision?: number;
  banner_asset?: Record<string, unknown>;
  image_asset?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequestForm {
  image: File | null;
  banner: File | null;
}
