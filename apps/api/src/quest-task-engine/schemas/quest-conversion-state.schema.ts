import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type QuestConversionStateDocument =
  HydratedDocument<QuestConversionState>;

@Schema({
  timestamps: true,
  collection: 'quest_task_conversion_state',
  autoIndex: false,
  autoCreate: false,
})
export class QuestConversionState {
  @Prop({ type: Types.ObjectId, required: true, immutable: true, ref: 'Quest' })
  quest_id: Types.ObjectId;

  @Prop({ type: String, required: true, immutable: true })
  task_key: string;

  @Prop({ type: String, required: true, immutable: true })
  progress_scope_key: string;

  @Prop({ type: String, required: true, immutable: true })
  conversion_identity: string;

  @Prop({ type: Number, required: true, min: 0 })
  high_water_version: number;

  @Prop({ type: String, required: true })
  high_water_event_id: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: true, default: 0 })
  active_value: number;

  @Prop({ type: Number, required: false })
  active_thb_minor?: number;

  // Monotonic evidence that this conversion positively qualified while its
  // beneficiary was in the quest audience. It survives reversal so an
  // in-window requalification can follow the same eligibility lineage even if
  // the user's current membership tier later changes.
  @Prop({ type: Boolean, required: true, default: false })
  ever_audience_qualified: boolean;
}

export const QuestConversionStateSchema =
  SchemaFactory.createForClass(QuestConversionState);
QuestConversionStateSchema.index(
  { quest_id: 1, task_key: 1, progress_scope_key: 1, conversion_identity: 1 },
  { name: 'uniq_quest_conversion_state', unique: true },
);
