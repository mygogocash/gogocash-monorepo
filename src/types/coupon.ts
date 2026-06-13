export type DiscountType = "percent" | "cash";

export interface CouponRequestForm {
  name: string;
  description: string;
  code: string;
  code_enabled?: boolean;
  one_time_use_enabled?: boolean;
  usage_per_user?: string;
  offer_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  eligibility: string;
  min_spend: string;
  min_spend_enabled?: boolean;
  min_spend_currency?: string;
  max_cap?: string;
  max_cap_enabled?: boolean;
  max_cap_currency?: string;
  discount: number;
  discount_type?: DiscountType;
  discount_currency?: string;
  id?: string;
  disabled?: boolean;
  quantity?: number;
  link?: string;
  terms_and_conditions?: string;
}


export interface ResponseCoupon {
    page:       string;
    limit:      string;
    total:      number;
    totalPages: number;
    data:       CouponData[];
}

export interface CouponData {
    _id:         string;
    name:        string;
    description: string;
    code:        string;
    code_enabled?: boolean;
    one_time_use_enabled?: boolean;
    usage_per_user?: string;
    offer_id:    OfferID;
    start_date:  string;
    end_date:    string;
    start_time?: string;
    end_time?:   string;
    eligibility: string;
    min_spend:   string;
    min_spend_enabled?: boolean;
    min_spend_currency?: string;
    max_cap?: string;
    max_cap_enabled?: boolean;
    max_cap_currency?: string;
    discount:    number;
    discount_type?: DiscountType;
    discount_currency?: string;
    createdAt:   Date;
    updatedAt:   Date;
    disabled:    boolean;
    __v:         number;
    link:        string;
    terms_and_conditions?: string;
}

export interface OfferID {
    _id:        string;
    offer_name: string;
}
