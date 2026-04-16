import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CreditScoreConfigDocument = HydratedDocument<CreditScoreConfig>;

@Schema({ _id: false })
export class CreditScoreTier {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Number })
  min_score: number;

  @Prop({ required: true, type: Number })
  max_score: number;

  @Prop({ required: true })
  color: string;

  @Prop({ type: [String], default: [] })
  benefits: string[];
}

export const CreditScoreTierSchema =
  SchemaFactory.createForClass(CreditScoreTier);

@Schema({ _id: false })
export class CreditScoreWeights {
  @Prop({ type: Number, default: 0.25 })
  conversion_count: number;

  @Prop({ type: Number, default: 0.25 })
  total_spend: number;

  @Prop({ type: Number, default: 0.25 })
  referral_count: number;

  @Prop({ type: Number, default: 0.25 })
  account_age_days: number;
}

export const CreditScoreWeightsSchema =
  SchemaFactory.createForClass(CreditScoreWeights);

@Schema({ timestamps: true })
export class CreditScoreConfig {
  @Prop({ type: [CreditScoreTierSchema], default: [] })
  tiers: CreditScoreTier[];

  @Prop({ type: CreditScoreWeightsSchema, default: () => ({}) })
  weights: CreditScoreWeights;

  @Prop({ type: Number, default: 1000 })
  max_score: number;
}

export const CreditScoreConfigSchema =
  SchemaFactory.createForClass(CreditScoreConfig);
