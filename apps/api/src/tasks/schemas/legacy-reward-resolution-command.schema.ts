import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LegacyRewardResolutionCommandDocument =
  HydratedDocument<LegacyRewardResolutionCommand>;

@Schema({ timestamps: true, collection: 'legacyrewardresolutioncommands' })
export class LegacyRewardResolutionCommand {
  @Prop({ required: true })
  command_key: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  reconciliation_version: number;

  @Prop({ required: true, enum: ['preparing', 'complete'] })
  status: 'preparing' | 'complete';

  @Prop({ required: true })
  plan_checksum: string;

  @Prop({ required: true })
  quest_snapshot_checksum: string;

  @Prop({ required: true })
  quest_config_checksum: string;

  @Prop({ required: true })
  evidence_checksum: string;

  @Prop({ type: [String], required: true })
  expected_manifest_hashes: string[];

  @Prop({ type: Date, required: false })
  completed_at?: Date;
}

export const LegacyRewardResolutionCommandSchema = SchemaFactory.createForClass(
  LegacyRewardResolutionCommand,
);

LegacyRewardResolutionCommandSchema.index(
  { command_key: 1 },
  { unique: true, name: 'uniq_legacy_reward_resolution_command' },
);
