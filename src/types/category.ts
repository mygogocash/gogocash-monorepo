export interface ResCategoryList {
  _id: string;
  name: string;
  image?: string;
  /** Wide hero / header image for this category (optional). */
  banner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequestForm {
  image: File | null;
  banner: File | null;
}