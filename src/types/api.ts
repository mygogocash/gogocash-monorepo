// API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  _id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  token: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  message?: string;
}

export interface AdminUsersQuery {
  limit?: number;
  page?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface AdminUsersResponse {
  data: DataAdminUsers[];
  pagination: Pagination;
}

export interface DataAdminUsers {
  _id: string;
  username: string;
  password: string;
  email: string;
  status?: "active" | "pending";
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Regular User Types (from /user endpoint)

export interface RegularUser {
  _id: string;
  address: string;
  __v: number;
  email: string;
  id_crossmint: string;
  id_twitter: string;
  username: string;
  mobile?: string;
  id_firebase: string;
  createdAt: Date;
  updatedAt: Date;
  birthdate: Date | null;
  country: string | null;
  gender: string | null;
}
export interface UsersQuery {
  limit?: number;
  page?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UsersResponse {
  data: RegularUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStatsResponse {
  gogocashUsers: number;
  mycashbackUsers: number;
}

export interface DashboardSummaryResponse {
  conversionCount: number;
  conversionTotalPayout: number;
  withdrawByStatus: {
    pending: { count: number; total: number };
    approved: { count: number; total: number };
    rejected: { count: number; total: number };
  };
}

/** Admin-controlled offer card / listing tags (app merchandising). */
export interface OfferDisplayTags {
  /** Show a “brand category” style tag. */
  brand_category_enabled: boolean;
  /** System category name from Category Management list, or empty to use partner `categories`. */
  brand_category_label: string;
  extra_cashback_tag: boolean;
  grab_coupon_tag: boolean;
  /** When true, show “Expire in {n} days” using `expire_in_days`. */
  expire_in_days_enabled: boolean;
  expire_in_days: number | null;
}

export const DEFAULT_OFFER_DISPLAY_TAGS: OfferDisplayTags = {
  brand_category_enabled: false,
  brand_category_label: "",
  extra_cashback_tag: false,
  grab_coupon_tag: false,
  expire_in_days_enabled: false,
  expire_in_days: null,
};

export function normalizeOfferDisplayTags(value: unknown): OfferDisplayTags {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_OFFER_DISPLAY_TAGS };
  }
  const o = value as Record<string, unknown>;
  const rawDays = o.expire_in_days;
  let expire: number | null = null;
  if (rawDays !== "" && rawDays != null && !Number.isNaN(Number(rawDays))) {
    const n = Math.floor(Number(rawDays));
    if (n >= 1) expire = n;
  }
  return {
    brand_category_enabled: Boolean(o.brand_category_enabled),
    brand_category_label: String(o.brand_category_label ?? "").trim(),
    extra_cashback_tag: Boolean(o.extra_cashback_tag),
    grab_coupon_tag: Boolean(o.grab_coupon_tag),
    expire_in_days_enabled: Boolean(o.expire_in_days_enabled),
    expire_in_days: expire,
  };
}

/** One product-type row on an offer (display name + commission details for admins). */
export interface OfferProductTypeEntry {
  name: string;
  commission_info: string;
  /** Optional app deep link for this brand / product line. */
  deeplink?: string;
}

/**
 * Coerce API/mock payloads to typed rows. Older data may still use `string[]`.
 */
export function normalizeOfferProductTypes(value: unknown): OfferProductTypeEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((item): OfferProductTypeEntry => {
    if (typeof item === "string") {
      return { name: item.trim(), commission_info: "", deeplink: "" };
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      return {
        name: String(o.name ?? "").trim(),
        commission_info: String(o.commission_info ?? "").trim(),
        deeplink: String(o.deeplink ?? "").trim(),
      };
    }
    return { name: "", commission_info: "", deeplink: "" };
  });
}

/** POST `/offer` — create a merchant row from affiliate feed data and optional app deeplink (mock + future API). */
export interface CreateBrandFromAffiliatePayload {
  brand_name: string;
  affiliate_network_id: string;
  /** Partner / network tracking or destination URL for this brand line. */
  affiliate_tracking_link: string;
  /** GoGoCash in-app open URL; stored as commission deeplink mapping for the new offer. */
  app_deeplink?: string;
  countries?: string;
  currency?: string;
  deeplink_store_id?: string;
  /** URL slug segment for `open/offer/{lookup}`; auto-generated if omitted. */
  lookup_value?: string;
  description?: string;
  /** Shown as partner rate hint; optional. */
  commission_store?: number | null;
}

// Offer Types (from /offer endpoint)
export interface Offer {
  _id: string;
  offer_id: number;
  __v: number;
  categories: string;
  commission_tracking: string;
  commissions: string[];
  countries: string;
  currency: string;
  datetime_created: Date;
  datetime_updated: Date;
  description: string;
  directory_page: string;
  is_require_approval: number;
  logo: string;
  lookup_value: string;
  marketplace_store_offer: boolean;
  merchant_id: number;
  offer_name: string;
  payment_terms: number;
  preview_url: string;
  special_commissions: unknown[];
  tracking_link: string;
  tracking_type: string;
  validation_terms: number;
  logo_desktop: string;
  logo_mobile: string;
  banner: string;
  logo_circle: string;
  disabled: boolean;
  offer_name_display: string;
  commission_store: number | null;
  /** Admin-configured cap (editable in this form). */
  max_cap: number | null;
  /** Max cap as supplied by the partner / network feed (read-only). */
  partner_max_cap?: number | string | null;
  banner_mobile: string;
  /** When true, treat as top-brand placement (API field name: extra_store). */
  extra_store: boolean;
  /** Active policy (from category; optional if API provides it) */
  active_policy?: string | null;
  /** When set, T&C for this offer come from this category’s policy (Policy Management). Empty = use offer category name to resolve. */
  policy_category_id?: string | null;
  /** Upsize event (optional, from API) */
  upsize_start_date?: string | null;
  upsize_end_date?: string | null;
  upsize_special_commission?: number | null;
  upsize_max_cap?: number | null;
  /** Product types for this offer (optional, from API) */
  product_types?: OfferProductTypeEntry[];
  /** Admin-entered commission notes or tiers (e.g. internal deals); separate from partner feed. */
  admin_commission_info?: string[];
  /** Short message from admin shown to end users for this offer (e.g. app offer detail). */
  note_to_user?: string | null;
  /** Affiliate / performance network name (e.g. Involve Asia). Optional; UI may derive from offer id in mock. */
  affiliate_partner?: string | null;
  /** Admin-selected advertiser line (e.g. `shopee_cps`, `shopee_cps_new`); sent as store= in URL. */
  deeplink_store_id?: string | null;
  /** Pills / labels for offer discovery (category, promos, expiry messaging). */
  offer_display_tags?: OfferDisplayTags;
}

export interface OfferRequestForm {
  logo_desktop: File | null;
  logo_mobile: File | null;
  banner: File | null;
  logo_circle: File | null;
  offer_name_display: string;
  disabled: boolean;
  max_cap: number | null;
  commission_store: number | null;
  id: string;
  banner_mobile: File | null;
  /** Top brands toggle (persisted as extra_store). */
  extra_store: boolean;
  /** Upsize event */
  upsize_start_date: string | null;
  upsize_end_date: string | null;
  upsize_special_commission: number | null;
  upsize_max_cap: number | null;
  /** Product types (name + commission info per row) for this offer */
  product_types?: OfferProductTypeEntry[];
  /** Admin commission lines (saved with offer; not from partner API). */
  admin_commission_info?: string[];
  /** Category whose terms & conditions apply; empty string = default (match offer category). */
  policy_category_id: string;
  /** Shown to users in the app; empty = no message. */
  note_to_user: string;
  /** Affiliate network id (`involve_asia`, `optimise`, `accesstrade`, …). */
  affiliate_network_id: string;
  /** Advertiser / market for deep link targeting (see `DEEPLINK_STORE_OPTIONS`). */
  deeplink_store_id: string;
  offer_display_tags: OfferDisplayTags;
}

export interface OffersQuery {
  search?: string;
  limit?: number;
  page?: number;
  category?: string;
  status?: string;
  type?: string;
  country?: string;
}

export interface WithdrawQuery {
  search?: string;
  limit?: number;
  page?: number;
  /** Server-side filter: pending | approved | rejected */
  status?: string;
  /** Server-side filter: e.g. bank_transfer, web3, crypto */
  method?: string;
}

export interface ConversionQuery {
  search?: string;
  limit?: number;
  page?: number;
  status?: string;
  key?: string;
}

export interface OffersResponse {
  data: Offer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Curated homepage top-brand rail (admin). Mock: in-memory order of offer `_id`s. */
export interface TopBrandsAdminResponse {
  order: string[];
  items: Offer[];
}

export interface SaveTopBrandsResponse {
  success: boolean;
  order: string[];
  message?: string;
}

export interface ResponseWithdraws {
  data: DataWithdrawsList[];
  pagination: Pagination;
}

export interface UserID {
  _id: string;
  address: string;
  email: string;
  username: string;
}
export interface DataWithdrawsList {
  user_id: UserID;
  _id: string;
  address: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  amount_total: number;
  amount_net: number;
  percent_fee: number;
  status: string;
  method: string;
  tx_hash: string;
  conversion_id: number[];
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  slip_file: string
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResponseConversion {
  status: string;
  message: string;
  data: DataConversion[];
  pagination: Pagination;
}

export interface DataConversionAll {
  page: number;
  limit: number;
  count: number;
  nextPage: null;
  data: DataConversion[];
}

export interface DataConversion {
  conversion_id: number;
  offer_id: number;
  aff_sub1: null | string;
  aff_sub2: null;
  aff_sub3: null;
  aff_sub4: null;
  aff_sub5: null;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: null | string;
  adv_sub5: string;
  datetime_conversion: Date;
  conversion_status: string;
  affiliate_remarks: null;
  currency: string;
  sale_amount: string;
  payout: string;
  base_payout: string;
  bonus_payout: string;
  merchant_id: number;
  offer_name: string;
  user?: UserID;
  createdAt: Date;
  updatedAt: Date;
  remark?: string;
}


/** Per-country (or territory) withdrawal fee rules; legacy THB/USD columns mirror common pairs. */
export interface FeeWithdrawRegion {
  id: string;
  /** ISO 3166-1 alpha-2 */
  countryCode: string;
  /** ISO 4217 */
  currency: string;
  feeWithdraw: number;
  minimumWithdraw: number;
}

export interface ResponseFee {
    _id:              string;
    system:           number;
    // store:            number;
    createdAt:        Date;
    updatedAt:        Date;
    __v:              number;
    minimum_withdraw_thb: number;
    minimum_withdraw_usd: number;
    fee_withdraw_usd: number;
    fee_withdraw_thb: number;
    /** When present, preferred source for multi-country configuration. */
    withdraw_regions?: FeeWithdrawRegion[];
}

export interface FeeSettingsForm {
    system:           number;
    // store:            number;
    // minimum_withdraw: number;
    id: string;
    minimum_withdraw_thb: number;
    minimum_withdraw_usd: number;
    fee_withdraw_usd: number;
    fee_withdraw_thb: number;
    withdraw_regions?: FeeWithdrawRegion[];
}