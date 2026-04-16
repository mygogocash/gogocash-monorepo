import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CreditScoreAuditDocument = HydratedDocument<CreditScoreAudit>;

@Schema({ timestamps: true })
export class CreditScoreAudit {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: Number })
  previous_score: number;

  @Prop({ required: true, type: Number })
  new_score: number;

  @Prop({ required: true })
  previous_tier: string;

  @Prop({ required: true })
  new_tier: string;

  @Prop({ required: true })
  change_type: string; // calculated | manual_override

  @Prop({ required: true })
  reason: string;

  @Prop({ type: String, required: false, default: null })
  admin_id: string;

  @Prop({ type: Object, default: {} })
  score_breakdown: Record<string, any>;
}

export const CreditScoreAuditSchema =
  SchemaFactory.createForClass(CreditScoreAudit);
