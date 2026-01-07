import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FeeRateDocument = HydratedDocument<FeeRate>;

@Schema({ timestamps: true })
export class FeeRate {
  @Prop({ required: false })
  system: number;

  @Prop({ required: false })
  store: number;

  @Prop({ required: false })
  minimum_withdraw: number;

  @Prop({ required: false })
  minimum_withdraw_thb: number;

  @Prop({ required: false })
  minimum_withdraw_usd: number;

  @Prop({ required: false })
  fee_withdraw_thb: number;

  @Prop({ required: false })
  fee_withdraw_usd: number;
}

export const FeeRateSchema = SchemaFactory.createForClass(FeeRate);
