// export interface QuestRankResponse {
//     user_id:    string;
//     username:   string;
//     email:      string;
//     conversion: Conversion[];
//     rank?:      number;
// }

export interface QuestRankResponse {
  _id: string;
  user_id: string;
  username: string;
  email: string;
  point: number;
  unique_merchants?: number[];
  conversion: Conversion[];
  extra_point_received: number;
  bonus_over_300_received: number;
  extra_point_referral?: number;
  point_social_reward?: number;
  rank?: number;
}

export interface Conversion {
  currencyOld: Currency;
  currency: Currency;
  totalSaleAmount: number;
  items: [];
  rate: number;
  saleAmount: number;
}

export enum Currency {
  THB = "THB",
  USD = "USD",
}

export interface ResponseQuestDate {
  _id: string;
  status: string;
  __v: number;
  createdAt: Date;
  end_date: Date;
  start_date: Date;
  updatedAt: Date;
  facebook_page: string;
  line: string;
  facebook_post: string;
  banner_en: string;
  banner_th: string;
  sub_banner_en: string;
  sub_banner_th: string;
}

export interface ResSocialReward {
  quest: Quest;
  socialRewards: SocialReward[];
}

export interface Quest {
  _id: string;
  status: string;
  __v: number;
  createdAt: Date;
  end_date: Date;
  reward_status: boolean;
  start_date: Date;
  updatedAt: Date;
  facebook_page: string;
  line: string;
  facebook_post: string;
}
export interface SocialReward {
  user_id: string;
  quest_id: string;
  reward_status: boolean;
  type: string;
  action: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}
