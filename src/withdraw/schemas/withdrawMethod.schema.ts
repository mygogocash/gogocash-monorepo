import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WithdrawMethodDocument = HydratedDocument<WithdrawMethod>;

@Schema({ timestamps: true })
export class WithdrawMethod {
  @Prop({ required: true })
  account_no: string;

  @Prop({ required: true })
  account_name: string;

  @Prop({ required: true })
  bank_name: string;

  @Prop({ required: true })
  bank_code: string;

  @Prop({ required: false })
  is_default: boolean;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;
}

export const WithdrawMethodSchema =
  SchemaFactory.createForClass(WithdrawMethod);
