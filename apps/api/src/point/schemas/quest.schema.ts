import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Offer } from 'src/offer/schemas/offer.schema';
import {
  QuestMediaAsset,
  QuestMediaAssetSchema,
} from './quest-media-asset.schema';

export type QuestDocument = HydratedDocument<Quest>;

@Schema({ _id: false })
export class QuestTask {
  @Prop({ required: false })
  task_key?: string;

  @Prop({
    type: String,
    required: false,
    enum: ['brand_purchase', 'friend_referral', 'spend_target'],
  })
  task_type?: 'brand_purchase' | 'friend_referral' | 'spend_target';

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Offer.name,
    required: false,
  })
  offer?: Types.ObjectId;

  @Prop({ required: false })
  offer_id?: number;

  @Prop({ required: false })
  merchant_id?: number;

  /**
   * Internal revision-recovery marker. A frozen source can reference an Offer
   * that was later retired; cloning it disabled lets Admin replace/remove the
   * row while publish preflight remains fail-closed.
   */
  @Prop({ required: false, default: false })
  source_offer_remediation_required?: boolean;

  @Prop({ required: false, min: 2, max: 10000 })
  extra_point?: number;

  @Prop({ required: false, min: 2, max: 10000 })
  points?: number;

  @Prop({
    type: String,
    required: false,
    enum: ['account_created', 'first_earning_conversion'],
  })
  completion_rule?: 'account_created' | 'first_earning_conversion';

  @Prop({ type: String, required: false, enum: ['any_shop_via_ggc'] })
  spend_scope?: 'any_shop_via_ggc';

  @Prop({ required: false, min: 1, max: Number.MAX_SAFE_INTEGER })
  target_thb_minor?: number;

  @Prop({ required: true, default: 0 })
  sort_order: number;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording: string;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording_en: string;

  @Prop({ required: false, default: '', maxlength: 140 })
  wording_th: string;

  @Prop({ required: false, default: '' })
  notes: string;
}

export const QuestTaskSchema = SchemaFactory.createForClass(QuestTask);

@Schema({ _id: false })
export class QuestReward {
  @Prop({ required: true, min: 1 })
  rank: number;

  @Prop({ required: true, min: 0 })
  reward: number;

  @Prop({ required: true, default: 'THB' })
  currency: string;
}

export const QuestRewardSchema = SchemaFactory.createForClass(QuestReward);

@Schema({ _id: false })
export class QuestAudience {
  @Prop({
    type: String,
    required: true,
    default: 'all',
    enum: ['all', 'membership_tiers'],
  })
  kind: 'all' | 'membership_tiers';

  @Prop({ type: [String], required: true, default: [] })
  tier_ids: string[];
}

export const QuestAudienceSchema = SchemaFactory.createForClass(QuestAudience);

@Schema({ _id: false })
export class QuestRewardCaps {
  @Prop({ type: Number, required: false, default: null, min: 1 })
  max_awards_per_user: number | null;

  @Prop({ type: Number, required: false, default: null, min: 1 })
  max_referrals_per_user: number | null;
}

export const QuestRewardCapsSchema =
  SchemaFactory.createForClass(QuestRewardCaps);

export type QuestRewardDistributionMode =
  'manual' | 'campaign_end' | 'after_days';

@Schema({ _id: false })
export class QuestBannerAssets {
  @Prop({ type: QuestMediaAssetSchema, required: false })
  banner_en?: QuestMediaAsset;

  @Prop({ type: QuestMediaAssetSchema, required: false })
  banner_th?: QuestMediaAsset;

  @Prop({ type: QuestMediaAssetSchema, required: false })
  sub_banner_en?: QuestMediaAsset;

  @Prop({ type: QuestMediaAssetSchema, required: false })
  sub_banner_th?: QuestMediaAsset;
}

export const QuestBannerAssetsSchema =
  SchemaFactory.createForClass(QuestBannerAssets);

@Schema({ timestamps: true })
export class Quest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Quest', required: false })
  revision_of?: Types.ObjectId;

  @Prop({ type: Number, required: false, min: 1 })
  revision_number?: number;

  @Prop({ type: Number, required: false, min: 0 })
  revision_source_campaign_revision?: number;

  @Prop({ type: Number, required: false, min: 0 })
  revision_source_config_revision?: number;

  @Prop({ type: String, required: false, maxlength: 500 })
  revision_reason?: string;

  @Prop({ type: String, required: false })
  revision_created_by?: string;

  @Prop({ type: String, required: false })
  revision_request_key?: string;

  @Prop({ type: String, required: false, match: /^[a-f0-9]{64}$/ })
  revision_payload_hash?: string;

  @Prop({
    type: String,
    required: false,
    enum: ['draft', 'published'],
  })
  publication_status?: 'draft' | 'published';

  @Prop({ type: Date, required: false })
  published_at?: Date;

  @Prop({ type: String, required: false })
  published_by?: string;

  @Prop({ type: String, required: false })
  publish_request_key?: string;

  @Prop({ type: String, required: false, match: /^[a-f0-9]{64}$/ })
  publish_payload_hash?: string;

  @Prop({ type: [String], required: true, default: [] })
  blocked_decisions: string[];

  @Prop({ required: true, default: 0, min: 0 })
  campaign_revision: number;

  @Prop({ required: true, default: 0, min: 0 })
  config_revision: number;

  @Prop({
    type: String,
    required: false,
    enum: ['legacy_v1', 'task_v2'],
  })
  reward_model?: 'legacy_v1' | 'task_v2';

  @Prop({
    type: String,
    required: true,
    default: 'Asia/Bangkok',
    enum: ['Asia/Bangkok'],
  })
  timezone: 'Asia/Bangkok';

  @Prop({ type: QuestAudienceSchema, required: true, default: { kind: 'all' } })
  audience: QuestAudience;

  @Prop({ type: QuestRewardCapsSchema, required: true, default: {} })
  reward_caps: QuestRewardCaps;

  @Prop({ type: Date, required: false })
  task_v2_state_frozen_at?: Date;

  @Prop({ type: Number, required: false, min: 0 })
  task_v2_state_frozen_revision?: number;

  @Prop({
    type: String,
    required: false,
    enum: ['outbox', 'progress', 'award'],
  })
  task_v2_state_frozen_reason?: 'outbox' | 'progress' | 'award';

  @Prop({
    type: String,
    required: false,
    enum: ['pending', 'ready', 'quarantined'],
  })
  legacy_payout_reconciliation_status?: 'pending' | 'ready' | 'quarantined';

  @Prop({ type: Number, required: false, min: 1 })
  legacy_payout_reconciliation_version?: number;

  @Prop({ type: Date, required: false })
  legacy_payout_reconciled_at?: Date;

  /** Immutable legacy eligibility/task/schedule/reward/social economics hash. */
  @Prop({ type: String, required: false, match: /^[a-f0-9]{64}$/ })
  legacy_payout_config_checksum?: string;

  /** Standalone-safe resolution fence; once set legacy economics are frozen. */
  @Prop({ type: String, required: false })
  legacy_payout_resolution_command_key?: string;

  @Prop({ type: String, required: false, match: /^[a-f0-9]{64}$/ })
  legacy_payout_resolution_plan_checksum?: string;

  @Prop({ type: Date, required: false })
  legacy_payout_resolution_started_at?: Date;

  @Prop({ type: Date, required: false })
  legacy_special_point_completed_at?: Date;

  @Prop({ type: Date, required: false })
  legacy_rank_payout_completed_at?: Date;

  @Prop({ required: false, index: true })
  media_command_key?: string;

  @Prop({ required: false, index: true })
  media_attempt_token?: string;

  @Prop({ required: false, index: true })
  qa_marker?: string;

  @Prop({ required: true })
  start_date: Date;

  @Prop({ required: true })
  end_date: Date;

  @Prop({ required: true })
  status: string; // 'open' | 'close' | 'scheduled'

  @Prop({ required: true, default: false })
  reward_status: boolean;

  @Prop({ type: String, required: true, default: 'campaign_end' })
  reward_distribution_mode: QuestRewardDistributionMode;

  @Prop({ required: true, default: 0 })
  reward_distribution_delay_days: number;

  @Prop({ type: Date, required: false, default: null })
  reward_distribution_scheduled_at: Date | null;

  @Prop({ required: false })
  facebook_post: string;

  @Prop({ required: false })
  facebook_page: string;

  @Prop({ required: false })
  line: string;

  @Prop({ required: false })
  banner_en: string;

  @Prop({ required: false })
  banner_th: string;

  @Prop({ required: false })
  sub_banner_en: string;

  @Prop({ required: false })
  sub_banner_th: string;

  @Prop({ type: QuestBannerAssetsSchema, required: true, default: {} })
  banner_assets: QuestBannerAssets;

  @Prop({ type: [QuestTaskSchema], default: [] })
  tasks: QuestTask[];

  @Prop({ type: [QuestRewardSchema], default: [] })
  rewards: QuestReward[];
}

export const QuestSchema = SchemaFactory.createForClass(Quest);

QuestSchema.index({ revision_request_key: 1 }, { unique: true, sparse: true });
QuestSchema.index({ publish_request_key: 1 }, { unique: true, sparse: true });
QuestSchema.index(
  { revision_of: 1, revision_number: 1 },
  { unique: true, sparse: true },
);
QuestSchema.index({ publication_status: 1, start_date: 1, end_date: 1 });
