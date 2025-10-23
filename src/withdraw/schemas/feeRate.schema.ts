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
}

export const FeeRateSchema = SchemaFactory.createForClass(FeeRate);
