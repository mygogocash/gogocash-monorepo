export interface CouponRequestForm {
  name: string;
  description: string;
  code: string;
  offer_id: string;
  start_date: string;
  end_date: string;
  eligibility: string;
  min_spend: string;
  discount: number;
  id?: string;
  disabled?: boolean;
  quantity?: number;
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
    offer_id:    OfferID;
    start_date:  string;
    end_date:    string;
    eligibility: string;
    min_spend:   string;
    discount:    number;
    createdAt:   Date;
    updatedAt:   Date;
    disabled:    boolean;
    __v:         number;
}

export interface OfferID {
    _id:        string;
    offer_name: string;
}
