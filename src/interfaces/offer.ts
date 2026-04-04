export interface IResponseOffer {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: DataOffer[];
}

export type TypeCommissions = Record<string, string>;
export type Commission = TypeCommissions;

export interface DataOffer {
  _id: string;
  offer_id: number;
  __v: number;
  categories: string;
  commission_tracking: CommissionTracking;
  commissions: TypeCommissions[];
  countries: string;
  currency: Currency;
  datetime_created: Date;
  datetime_updated: Date;
  description: string;
  directory_page: string;
  is_require_approval: number;
  logo: string;
  logo_desktop: string;
  logo_mobile: string;
  lookup_value: LookupValue;
  marketplace_store_offer: boolean;
  merchant_id: number;
  offer_name: string;
  payment_terms: number;
  preview_url: string;
  special_commissions: TypeCommissions[];
  tracking_link: string;
  tracking_type: TrackingType;
  validation_terms: number;
  offer_name_display: string;
  disabled: boolean;
  banner: string;
  banner_mobile: string;
  logo_circle: string;
  commission_store: number;
  max_cap: number;
  extra_point: number | null;
  product_type: ProductTypeList[];
}

export interface ProductTypeList {
  name: string;
  minimum: string;
}

export enum CommissionTracking {
  RealTime = "real-time",
}

export enum Currency {
  Aud = "AUD",
  Cny = "CNY",
  Eur = "EUR",
  Idr = "IDR",
  Myr = "MYR",
  Usd = "USD",
}

export enum LookupValue {
  CPA = "cpa",
  CPABoth = "cpa_both",
  CPS = "cps",
}

export enum TrackingType {
  Desktop = "desktop",
  DesktopMobile = "desktop mobile",
  DesktopMobileIosAndroid = "desktop mobile ios android",
  IosAndroid = "ios android",
}

export interface ItemMerchants {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  type: string;
  status: string;
  cashbackPercent: number;
  cashbackFlat: number;
  currency: string;
  website: string;
  trackingDuration: number;
  showTracking: boolean;
  showCashbackTag: boolean;
  rating: number;
  affiliateType: string;
  affiliateParams: null;
  clicksCount: number;
  merchantAliases: null;
  categories: null;
  terms: string;
  howToUse: string;
  hasCampaign: boolean;
  meta: null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMerchants {
  total: number;
  page: number;
  limit: number;
  pages: number;
  offset: number;
}

export interface IResponseCampaigns {
  success: boolean;
  error: null;
  data: IDataCampaigns[];
}

export interface IDataCampaigns {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: string;
  targetType: string;
  targetIds: string[];
  code: string;
  image: string;
  maxUses: number;
  usesCount: number;
  publisherId: string;
  isGlobal: boolean;
  termsConditions: string;
  meta: MetaCampaigns;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetaCampaigns {
  season: string;
  year: number;
}

export interface IResponseProducts {
  success: boolean;
  message: string;
  data: DataProducts;
}

export interface DataProducts {
  pagination: Pagination;
  products: Product[];
}

export interface Pagination {
  limit: number;
  page: number;
  pages: number;
  sortBy: string;
  sortOrder: string;
  total: number;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  sku: string;
  description: string;
  brand: string;
  price: number;
  originalPrice: number;
  currency: ProductCurrency;
  cashbackPercent: number;
  cashbackFlat: number;
  categories: ProductCategory[];
  tags: ProductTag[];
  images: string[];
  productUrl: string;
  affiliateUrl: string;
  status: ProductStatus;
  clicksCount: number;
  meta: null;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProductCategory {
  MenSShoesAndClothing = "Men's Shoes and Clothing",
}

export enum ProductCurrency {
  Thb = "THB",
}

export enum ProductStatus {
  Active = "active",
}

export enum ProductTag {
  Shopping = "Shopping",
}

export interface IResponseAds {
  success: boolean;
  message: string;
  data: DataAds[];
}

export interface DataAds {
  id: string;
  title: string;
  description: string;
  image: string;
  position: string;
  type: string;
  url: string;
  startDate: Date;
  endDate: Date;
  status: string;
  country: string;
  costPerClick: number;
  costPerImpression: number;
  showingRatio: number;
  impressions: number;
  clicks: number;
  publisherIds: string[];
  ignoredPublisherIds: string[];
  isGlobal: boolean;
  note: string;
  meta: null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  enableTargeting: boolean;
}

export interface IResponseMyOffer {
  _id: string;
  offer_id: number;
  merchant_id: number;
  user_id: string;
  deeplink: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  offer_name: string;
}

export interface IResponseFav {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: DataFavList[];
}

export interface OfferID {
  _id: string;
  offer_id: number;
  commissions: Commission[];
  logo: string;
  offer_name: string;
  logo_desktop: string;
  logo_mobile: string;
  offer_name_display: string;
}

export interface DataFavList {
  _id: string;
  offer_id: OfferID;
  user_id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface DataFav {
  offer_id: string;
  user_id: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface RequestDataFav {
  offer_id: string;
}

export interface BannerHomeMainSlide {
  image: string;
  link?: string | null;
}

export interface BannerHome {
  image_1: string;
  image_2: string;
  image_3: string;
  image_4: string;
  image_5: string;
  link_1: string;
  link_2: string;
  link_3: string;
  link_4: string;
  link_5: string;
  _id?: string;
  /** When set, drives the main hero Swiper instead of legacy `image_1`–`image_3` (variable length). */
  main_slides?: BannerHomeMainSlide[];
}

export interface CouponData {
  _id: string;
  name: string;
  description: string;
  code: string;
  offer_id: OfferID;
  start_date: string;
  end_date: string;
  eligibility: string;
  min_spend: string;
  discount: number;
  createdAt: Date;
  updatedAt: Date;
  disabled: boolean;
  __v: number;
  link: string;
}
