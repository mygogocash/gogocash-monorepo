import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawDocument = HydratedDocument<Withdraw>;

@Schema()
export class Withdraw {
  @Prop({ required: true, unique: false })
  address: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  status: string; // pending, completed, rejected

  @Prop({ required: true })
  method: string; // metamask, coinbase, bank etc.

  @Prop()
  tx_hash: string;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: Number })
  conversion_id: number;

  @Prop({ required: true, type: Number })
  offer_id: number;

  @Prop({ required: true })
  currency: string; // USDC, ETH, BTC etc.
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);
