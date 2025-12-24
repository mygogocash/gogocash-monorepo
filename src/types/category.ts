export interface ResCategoryList {
  _id: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRequestForm {
  image: File | null;
}