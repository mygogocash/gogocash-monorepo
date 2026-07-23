import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type QuestConversionTransitionDocument =
  HydratedDocument<QuestConversionTransition>;

@Schema({
  timestamps: true,
  collection: 'quest_conversion_transitions',
  autoIndex: false,
  autoCreate: false,
})
export class QuestConversionTransition {
  @Prop({ type: String, required: true, immutable: true })
  transition_id: string;

  @Prop({ type: String, required: true, immutable: true })
  source: string;

  @Prop({ type: String, required: true, immutable: true })
  provider_account: string;

  @Prop({ type: String, required: true, immutable: true })
  provider_conversion_id: string;

  @Prop({
    type: Types.ObjectId,
    required: false,
    immutable: true,
    ref: 'Conversion',
  })
  conversion_id?: Types.ObjectId;

  @Prop({ type: Number, required: true, immutable: true, min: 1 })
  transition_version: number;

  @Prop({ type: String, required: false, immutable: true })
  from_status?: string;

  @Prop({ type: String, required: true, immutable: true })
  to_status: string;

  @Prop({
    type: String,
    required: true,
    immutable: true,
    enum: [
      'pending',
      'approved',
      'reversed',
      'requalified',
      'correction',
      'ignored',
      'quarantined',
    ],
  })
  event_type: string;

  @Prop({ type: Date, required: true, immutable: true })
  occurred_at: Date;

  @Prop({ type: String, required: true, immutable: true })
  ordering_key: string;

  @Prop({ type: String, required: true, immutable: true })
  payload_hash: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false, immutable: true })
  previous?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, immutable: true })
  current: Record<string, unknown>;

  @Prop({ type: Boolean, required: true, immutable: true, default: false })
  quarantined: boolean;

  @Prop({ type: String, required: false, immutable: true })
  quarantine_reason?: string;
}

export const QuestConversionTransitionSchema = SchemaFactory.createForClass(
  QuestConversionTransition,
);
QuestConversionTransitionSchema.index(
  {
    source: 1,
    provider_account: 1,
    provider_conversion_id: 1,
    transition_version: 1,
  },
  { name: 'uniq_quest_conversion_transition', unique: true },
);
QuestConversionTransitionSchema.index(
  { transition_id: 1 },
  { name: 'uniq_quest_conversion_transition_id', unique: true },
);
QuestConversionTransitionSchema.index(
  { 'current.datetime_conversion': 1, quarantined: 1 },
  { name: 'idx_quest_conversion_transition_purchase_at' },
);
