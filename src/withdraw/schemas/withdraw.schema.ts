import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawDocument = HydratedDocument<Withdraw>;

@Schema({ timestamps: true })
export class Withdraw {
  @Prop({ required: false, unique: false })
  address: string;

  @Prop({ required: false })
  account_number: string;

  @Prop({ required: false })
  account_name: string;

  @Prop({ required: false })
  bank_name: string;

  @Prop({ required: true })
  amount_total: number;

  @Prop({ required: true })
  amount_net: number;

  @Prop({ required: true, type: Number })
  percent_fee: number;

  @Prop({ required: true })
  status: string; // pending, completed, rejected

  @Prop({ required: true })
  method: string; // metamask, coinbase, bank etc.

  @Prop()
  tx_hash: string;

  @Prop()
  tx_hash_record: string;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: [Number] })
  conversion_id: number[];

  @Prop({ required: true })
  currency: string; // USDC, ETH, BTC etc.

  @Prop({ required: false })
  slip_file: string;

  @Prop({ required: false, ref: 'UserMyCashback', type: Types.ObjectId })
  mycashback_id: Types.ObjectId;
}

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);
