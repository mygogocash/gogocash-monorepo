/** When API provides this, invitation tabs filter by it instead of client heuristics on `type`/`action`. */
export type ReferralListCategory = "account" | "shop";

export interface ResponseReferralList {
  _id: string;
  user_id: ReferralID;
  conversion_id: number;
  referral_id: ReferralID;
  point: number;
  type: string;
  action: string;
  /** Optional server-side bucket for `/point/referral-list` rows. */
  referral_category?: ReferralListCategory;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface ReferralID {
  _id: string;
  address: string;
  __v: number;
  email: string;
  id_crossmint: string;
  id_twitter: string;
  username: string;
  country: string;
}
