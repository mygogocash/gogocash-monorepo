import type { Offer } from "@/types/api";

export type QuestTaskType =
  "brand_purchase" | "friend_referral" | "spend_target";

export type QuestRewardModel = "legacy_v1" | "task_v2";

export interface QuestManagementCapabilities {
  revision_workflow_enabled: boolean;
  direct_create_enabled: boolean;
}

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

export type QuestEffectiveTaskCatalogSource =
  "canonical" | "legacy_compatibility" | "none";

export type QuestEffectiveTaskSource =
  "quest_task" | "legacy_offer_fallback" | "legacy_system_rule";

export type QuestEffectiveTaskKind = QuestTaskType | "points_threshold_bonus";

export type QuestEffectiveTaskTarget =
  | { kind: "purchase"; required_purchases: 1 }
  | {
      kind: "referral";
      completion_rule: "account_created" | "first_earning_conversion";
    }
  | {
      kind: "spend_thb_minor";
      spend_scope: "any_shop_via_ggc";
      target_thb_minor: number;
    }
  | { kind: "quest_points_threshold"; threshold_points: number };

export interface QuestEffectiveTaskOffer {
  id: string;
  name: string;
  logo_uri?: string;
  href?: string;
}

export interface QuestMutationCapabilities {
  can_edit_campaign_economics: boolean;
  can_edit_task_economics: boolean;
  can_edit_rewards: boolean;
  can_edit_presentation: boolean;
  can_create_revision: boolean;
  freeze_reason:
    | "QUEST_ALREADY_STARTED"
    | "QUEST_HAS_EFFECTS"
    | "QUEST_REVISION_PUBLISHED"
    | null;
}

export interface QuestRevisionWorkflowReadiness {
  workflow_enabled: boolean;
  task_v2_enabled: boolean;
  publish_ready: boolean;
  can_create_revision: boolean;
  can_publish: boolean;
  blockers: string[];
}

/**
 * Sanitized task definition that the customer currently sees.
 *
 * This deliberately stays separate from `QuestTask`: compatibility rows can
 * come from a legacy Offer or a server-owned system rule and are not
 * necessarily persisted in `quest.tasks`.
 */
export interface QuestEffectiveTask {
  task_key: string;
  task_kind: QuestEffectiveTaskKind;
  points: number;
  sort_order: number;
  wording_en: string;
  wording_th: string;
  target?: QuestEffectiveTaskTarget;
  offer?: QuestEffectiveTaskOffer;
  source: QuestEffectiveTaskSource;
  editable_fields: string[];
}

export interface QuestEffectiveTasksResponse {
  contract_version: 1;
  quest_id: string;
  config_revision: number;
  catalog_source: QuestEffectiveTaskCatalogSource;
  stored_task_count: number;
  effective_task_count: number;
  capabilities: QuestMutationCapabilities;
  revision_workflow: QuestRevisionWorkflowReadiness;
  tasks: QuestEffectiveTask[];
}

export interface CreateQuestRevisionPayload {
  request_key: string;
  expected_campaign_revision: number;
  expected_config_revision: number;
  start_date: string;
  end_date: string;
  reason: string;
}

export interface PublishQuestRevisionPayload {
  request_key: string;
  expected_campaign_revision: number;
  expected_config_revision: number;
}

export interface QuestRevisionWarning {
  code: string;
  message: string;
}

export interface QuestRevisionResponse {
  quest: ResponseQuestDate;
  revision_workflow: QuestRevisionWorkflowReadiness;
  warnings: QuestRevisionWarning[];
  blocked_decisions: string[];
}

export interface PublishQuestRevisionResponse {
  quest: ResponseQuestDate;
  published: true;
  revision_workflow: QuestRevisionWorkflowReadiness;
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
  revision_of?: string | { _id: string };
  revision_number?: number;
  revision_reason?: string;
  publication_status?: "draft" | "published";
  published_at?: Date | string;
  blocked_decisions?: string[];
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
