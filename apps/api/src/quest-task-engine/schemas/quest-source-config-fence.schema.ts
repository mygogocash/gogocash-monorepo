import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type QuestSourceConfigFenceDocument =
  HydratedDocument<QuestSourceConfigFence>;

@Schema({
  timestamps: true,
  collection: 'quest_source_config_fence',
  autoIndex: false,
  autoCreate: false,
})
export class QuestSourceConfigFence {
  // The deterministic primary key serializes the first two transactions even
  // before secondary indexes are built on a fresh database.
  @Prop({ type: String, required: true, immutable: true })
  _id: string;

  @Prop({ type: String, required: true, immutable: true })
  fence_key: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  revision: number;
}

export const QuestSourceConfigFenceSchema = SchemaFactory.createForClass(
  QuestSourceConfigFence,
);
QuestSourceConfigFenceSchema.index(
  { fence_key: 1 },
  { name: 'uniq_quest_source_config_fence', unique: true },
);
