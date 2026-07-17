import type { Offer } from "@/types/api";

export type QuestTaskType =
  "brand_purchase" | "friend_referral" | "spend_target";

export type QuestRewardModel = "legacy_v1" | "task_v2";

export type QuestAudience =
  { kind: "all" } | { kind: "membership_tiers"; tier_ids: string[] };

export interface QuestRewardCaps {
  max_awards_per_user: number | null;
  max_referrals_per_user: number | null;
}

export interface QuestTask {
  task_key: string;
  task_type: QuestTaskType;
  points: number;
  sort_order: number;
  enabled: boolean;
  offer?: string | Offer;
  offer_id?: number;
  merchant_id?: number;
  extra_point?: number;
  completion_rule?: "account_created" | "first_earning_conversion";
  spend_scope?: "any_shop_via_ggc";
  target_thb_minor?: number;
  wording?: string;
  wording_en?: string;
  wording_th?: string;
  notes?: string;
}

interface QuestTaskPayloadBase {
  task_key?: string;
  task_type: QuestTaskType;
  points: number;
  enabled: boolean;
  wording: string;
  wording_en: string;
  wording_th: string;
  notes: string;
}

export interface BrandPurchaseQuestTaskPayload extends QuestTaskPayloadBase {
  task_type: "brand_purchase";
  offer: string;
}

export interface FriendReferralQuestTaskPayload extends QuestTaskPayloadBase {
  task_type: "friend_referral";
  completion_rule: "account_created" | "first_earning_conversion";
}

export interface SpendTargetQuestTaskPayload extends QuestTaskPayloadBase {
  task_type: "spend_target";
  spend_scope: "any_shop_via_ggc";
  target_thb_minor: number;
}

export type QuestTaskPayload =
  | BrandPurchaseQuestTaskPayload
  | FriendReferralQuestTaskPayload
  | SpendTargetQuestTaskPayload;

export interface QuestTaskConfigSavePayload {
  reward_model: QuestRewardModel;
  expected_config_revision: number;
  timezone: "Asia/Bangkok";
  audience: QuestAudience;
  reward_caps: QuestRewardCaps;
  tasks: QuestTaskPayload[];
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
  "manual" | "campaign_end" | "after_days";

export interface QuestRewardSavePayload {
  expected_config_revision: number;
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
  campaign_revision?: number;
  config_revision?: number;
  reward_model?: QuestRewardModel;
  timezone?: "Asia/Bangkok";
  audience?: QuestAudience;
  reward_caps?: QuestRewardCaps;
  task_v2_state_frozen_at?: Date | string;
  task_v2_state_frozen_revision?: number;
  task_v2_state_frozen_reason?: "outbox" | "progress" | "award";
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
  banner_en: File | null;
  banner_th: File | null;
  sub_banner_en: File | null;
  sub_banner_th: File | null;
}
