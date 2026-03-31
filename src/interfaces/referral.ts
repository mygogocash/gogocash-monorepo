export interface ResponseReferralList {
  _id: string;
  user_id: ReferralID;
  conversion_id: number;
  referral_id: ReferralID;
  point: number;
  type: string;
  action: string;
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
