import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  QuestMediaAsset,
  QuestMediaAssetSchema,
} from './quest-media-asset.schema';

export type QuestMediaCleanupDocument = HydratedDocument<QuestMediaCleanup>;

@Schema({ timestamps: true, collection: 'quest_media_cleanup' })
export class QuestMediaCleanup {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  quest_id: Types.ObjectId;

  @Prop({ required: true, index: true })
  cleanup_key: string;

  @Prop({ required: true })
  payload_hash: string;

  @Prop({ required: true, min: 0 })
  replacement_revision: number;

  @Prop({
    required: true,
    enum: ['precommit-failure', 'replaced-after-commit', 'qa-acceptance'],
  })
  reason: 'precommit-failure' | 'replaced-after-commit' | 'qa-acceptance';

  @Prop({ type: QuestMediaAssetSchema, required: true })
  asset: QuestMediaAsset;

  @Prop({ required: true, enum: ['pending', 'deleted'], default: 'pending' })
  status: 'pending' | 'deleted';

  @Prop({ required: true, default: 0 })
  attempts: number;

  @Prop({ required: false, index: true })
  worker_token?: string;

  @Prop({ type: Date, required: false, index: true })
  lease_expires_at?: Date;

  @Prop({ required: false })
  last_error?: string;

  @Prop({ type: Date, required: false })
  deleted_at?: Date;

  @Prop({ type: Date, required: false, index: true })
  delete_confirm_after?: Date;

  @Prop({ type: Date, required: false })
  initial_delete_completed_at?: Date;
}

export const QuestMediaCleanupSchema =
  SchemaFactory.createForClass(QuestMediaCleanup);

QuestMediaCleanupSchema.index(
  { cleanup_key: 1, 'asset.object_key': 1 },
  { name: 'cleanup_key_1_asset_object_key_1', unique: true },
);
