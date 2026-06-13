import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletAdjustmentDocument = HydratedDocument<WalletAdjustment>;

@Schema({ timestamps: true })
export class WalletAdjustment {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  type: string; // credit | debit

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  admin_id: string;

  @Prop({ required: true })
  admin_name: string;
}

export const WalletAdjustmentSchema =
  SchemaFactory.createForClass(WalletAdjustment);
