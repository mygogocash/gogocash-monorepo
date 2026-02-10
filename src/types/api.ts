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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  special_commissions: any[];
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
  max_cap: number | null;
  banner_mobile: string;
  extra_store: boolean;
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
  extra_store: boolean;
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
}

export interface ConversionQuery {
  search?: string;
  limit?: number;
  page?: number;
  status?: string;
}

export interface OffersResponse {
  data: Offer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  user: UserID;
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
}