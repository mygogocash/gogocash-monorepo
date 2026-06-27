import type { Offer } from "@/types/api";

export interface QuestTask {
  offer: string | Offer;
  offer_id: number;
  merchant_id: number;
  extra_point: number;
  sort_order: number;
  enabled: boolean;
  wording?: string;
  wording_en?: string;
  wording_th?: string;
  notes?: string;
}

export interface QuestTaskPayload {
  offer: string;
  offer_id: number;
  merchant_id: number;
  extra_point: number;
  sort_order?: number;
  enabled?: boolean;
  wording?: string;
  wording_en?: string;
  wording_th?: string;
  notes?: string;
}

export interface QuestTaskDeeplinkSummary {
  offer: string;
  offer_id: number;
  merchant_id: number;
  offer_name: string;
  extra_point: number;
  sort_order: number;
  wording?: string;
  tracking_link: string;
  customer_path: string;
  generated_count: number;
  latest_click: string | null;
  sample_deeplink: string;
}

export interface QuestTaskDeeplinkSummaryResponse {
  data: QuestTaskDeeplinkSummary[];
}

export interface QuestReward {
  rank: number;
  reward: number;
  currency: string;
}

export interface QuestRewardPayload {
  rank: number;
  reward: number;
  currency: string;
}

export type QuestRewardDistributionMode =
  | "manual"
  | "campaign_end"
  | "after_days";

export interface QuestRewardSavePayload {
  rewards: QuestRewardPayload[];
  reward_distribution_mode: QuestRewardDistributionMode;
  reward_distribution_delay_days: number;
}

export interface QuestLeaderboardRow {
  rank: number;
  user_id: string;
  username: string;
  email: string;
  point: number;
  extra_point_received: number;
  extra_point_referral: number;
  point_social_reward: number;
  bonus_over_300_received: number;
  reward: number;
  currency: string;
}

export interface QuestLeaderboardResponse {
  data_source?: "quest_range" | "latest_available";
  empty_range_end_date?: string;
  empty_range_start_date?: string;
  quest: {
    _id: string;
    start_date: Date | string;
    end_date: Date | string;
    status: string;
    reward_status?: boolean;
    reward_distribution_mode?: QuestRewardDistributionMode;
    reward_distribution_delay_days?: number;
    reward_distribution_scheduled_at?: Date | string | null;
  };
  rewards: QuestReward[];
  source_end_date?: string;
  source_start_date?: string;
  data: QuestLeaderboardRow[];
}

export interface ResponseQuestDate {
  _id: string;
  status: string;
  reward_status?: boolean;
  reward_distribution_mode?: QuestRewardDistributionMode;
  reward_distribution_delay_days?: number;
  reward_distribution_scheduled_at?: Date | string | null;
  __v: number;
  createdAt: Date | string;
  end_date: Date | string;
  start_date: Date | string;
  updatedAt: Date | string;
  facebook_page: string;
  facebook_post: string;
  line: string;
  banner_en: string;
  banner_th: string;
  sub_banner_en: string;
  sub_banner_th: string;
  tasks?: QuestTask[];
  rewards?: QuestReward[];
}

export interface ResponseQuestCreateForm {
  start_date: string;
  end_date: string;
  facebook_page: string;
  facebook_post: string;
  line: string;
  banner_en: File | string;
  banner_th: File | string;
  sub_banner_en: File | string;
  sub_banner_th: File | string;
}
