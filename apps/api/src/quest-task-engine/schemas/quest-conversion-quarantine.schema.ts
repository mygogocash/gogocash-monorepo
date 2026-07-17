import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type QuestConversionQuarantineDocument =
  HydratedDocument<QuestConversionQuarantine>;

@Schema({
  timestamps: true,
  collection: 'quest_conversion_quarantine',
  autoIndex: false,
  autoCreate: false,
})
export class QuestConversionQuarantine {
  @Prop({ type: String, required: true, immutable: true })
  ambiguity_key: string;

  @Prop({ type: String, required: true, immutable: true })
  source: string;

  @Prop({ type: String, required: true, immutable: true })
  provider_account: string;

  @Prop({ type: String, required: true, immutable: true })
  provider_conversion_id: string;

  @Prop({ type: String, required: true, immutable: true })
  reason: string;

  @Prop({ type: Number, required: true, immutable: true, min: 0 })
  observed_high_water_version: number;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true, immutable: true })
  payload: Record<string, unknown>;

  /**
   * Populated only by a provider pull/reconciliation adapter after it verifies
   * ordering with the authoritative source. The original quarantined payload
   * remains immutable evidence and is never promoted on its own.
   */
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  authoritative_payload?: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  authoritative_verified_at?: Date;

  @Prop({ type: String, required: false })
  authoritative_source?: string;

  @Prop({
    type: String,
    required: true,
    default: 'pending',
    enum: ['pending', 'resolved', 'dismissed'],
  })
  status: string;

  @Prop({ type: Date, required: false })
  resolved_at?: Date;

  @Prop({ type: String, required: false })
  resolution_transition_id?: string;
}

export const QuestConversionQuarantineSchema = SchemaFactory.createForClass(
  QuestConversionQuarantine,
);
QuestConversionQuarantineSchema.index(
  { ambiguity_key: 1 },
  { name: 'uniq_quest_conversion_quarantine', unique: true },
);
