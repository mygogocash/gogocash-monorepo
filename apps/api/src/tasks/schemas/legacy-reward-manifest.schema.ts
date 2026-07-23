import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LegacyRewardManifestDocument =
  HydratedDocument<LegacyRewardManifestRecord>;

@Schema({ _id: false })
export class LegacyRewardManifestRecipientRecord {
  @Prop({ type: Types.ObjectId, required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  payout_key: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: Number, required: false, min: 1 })
  rank?: number;

  @Prop({ required: false })
  currency?: string;

  @Prop({ default: false })
  excluded: boolean;

  @Prop({ required: false })
  exclusion_reason?: string;
}

const LegacyRewardManifestRecipientSchema = SchemaFactory.createForClass(
  LegacyRewardManifestRecipientRecord,
);

@Schema({ timestamps: true, collection: 'legacyrewardmanifests' })
export class LegacyRewardManifestRecord {
  @Prop({ required: true })
  manifest_key: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ required: true, enum: ['rank', 'special-next-round'] })
  reward_type: 'rank' | 'special-next-round';

  @Prop({ type: Number, required: true, min: 1 })
  reconciliation_version: number;

  @Prop({ required: true, enum: ['ready', 'completed', 'quarantined'] })
  status: 'ready' | 'completed' | 'quarantined';

  @Prop({ type: [LegacyRewardManifestRecipientSchema], required: true })
  recipients: LegacyRewardManifestRecipientRecord[];

  @Prop({ required: true })
  manifest_hash: string;

  /** Hash of the immutable legacy model, schedule, reward and social config. */
  @Prop({ required: true, match: /^[a-f0-9]{64}$/ })
  quest_config_checksum: string;

  @Prop({ type: Date, required: false })
  completed_at?: Date;

  /** Human and source reference for the reviewed historical evidence. */
  @Prop({ required: false })
  reviewed_by?: string;

  @Prop({ required: false })
  review_reference?: string;

  /** Deterministic hash of the complete recipient/exclusion evidence file. */
  @Prop({ required: false })
  resolution_evidence_checksum?: string;

  /** Required by the resolver when an explicitly reviewed set is empty. */
  @Prop({ required: false })
  no_recipient_reason?: string;
}

export const LegacyRewardManifestSchema = SchemaFactory.createForClass(
  LegacyRewardManifestRecord,
);

LegacyRewardManifestSchema.index(
  { manifest_key: 1 },
  { unique: true, name: 'uniq_legacy_reward_manifest_key' },
);
LegacyRewardManifestSchema.index(
  { quest_id: 1, reward_type: 1 },
  { unique: true, name: 'uniq_legacy_reward_manifest_quest_type' },
);
