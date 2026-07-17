import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  QuestMediaAsset,
  QuestMediaAssetSchema,
} from './quest-media-asset.schema';

export type QuestMediaWriteCommandDocument =
  HydratedDocument<QuestMediaWriteCommand>;

@Schema({ _id: false })
export class QuestMediaWritePlan {
  @Prop({
    required: true,
    enum: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'],
  })
  role: 'banner_en' | 'banner_th' | 'sub_banner_en' | 'sub_banner_th';

  @Prop({ required: true, enum: ['quests'] })
  folder: 'quests';

  @Prop({ type: QuestMediaAssetSchema, required: true })
  asset: QuestMediaAsset;

  @Prop({ required: true, enum: ['planned', 'confirmed'] })
  upload_state: 'planned' | 'confirmed';
}

export const QuestMediaWritePlanSchema =
  SchemaFactory.createForClass(QuestMediaWritePlan);

@Schema({
  timestamps: true,
  collection: 'quest_media_write_commands',
  autoIndex: false,
})
export class QuestMediaWriteCommand {
  @Prop({ required: true })
  request_key: string;

  @Prop({ required: true })
  payload_hash: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  quest_id: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  expected_revision: number;

  @Prop({ required: false, min: 0 })
  expected_config_revision?: number;

  @Prop({ required: false, default: false })
  economic_change?: boolean;

  @Prop({ required: false, default: false })
  task_v2_economic_change?: boolean;

  @Prop({
    required: true,
    enum: ['uploading', 'committing', 'compensating', 'committed', 'failed'],
    index: true,
  })
  status: 'uploading' | 'committing' | 'compensating' | 'committed' | 'failed';

  @Prop({ required: true, index: true })
  attempt_token: string;

  @Prop({ type: Date, required: false, index: true })
  lease_expires_at?: Date;

  @Prop({ required: true, default: 1, min: 1 })
  attempts: number;

  @Prop({ type: [QuestMediaWritePlanSchema], required: true, default: [] })
  planned_assets: QuestMediaWritePlan[];

  @Prop({ type: [QuestMediaAssetSchema], required: true, default: [] })
  superseded_assets: QuestMediaAsset[];

  @Prop({ required: false, min: 1 })
  committed_revision?: number;

  @Prop({ type: Date, required: false, index: true })
  replacement_cleanup_completed_at?: Date;

  @Prop({ required: false })
  qa_marker?: string;

  @Prop({ required: false })
  qa_cleanup_nonce_hash?: string;

  @Prop({ type: Date, required: false })
  qa_cleanup_objects_deleted_at?: Date;

  @Prop({ required: false })
  last_error?: string;
}

export const QuestMediaWriteCommandSchema = SchemaFactory.createForClass(
  QuestMediaWriteCommand,
);

QuestMediaWriteCommandSchema.index(
  { request_key: 1 },
  { name: 'request_key_1', unique: true },
);
QuestMediaWriteCommandSchema.index(
  {
    'planned_assets.asset.owner_key': 1,
    'planned_assets.asset.owner_attempt_token': 1,
    'planned_assets.asset.object_key': 1,
  },
  { name: 'planned_asset_owner_attempt_object_1' },
);
