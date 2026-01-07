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
  id: string;   
}

export type BannerData = Omit<BannerRequestForm, 'id' >