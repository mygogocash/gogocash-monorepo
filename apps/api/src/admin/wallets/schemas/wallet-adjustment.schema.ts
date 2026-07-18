import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WalletAdjustmentDocument = HydratedDocument<WalletAdjustment>;

@Schema({ timestamps: true })
export class WalletAdjustment {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, enum: ['credit', 'debit'] })
  type: 'credit' | 'debit';

  @Prop({ required: true, type: Number, min: 0.000001, max: 100_000_000 })
  amount: number;

  @Prop({ default: 'USD', enum: ['THB', 'USD'], uppercase: true, trim: true })
  currency: 'THB' | 'USD';

  @Prop({ required: true, trim: true, maxlength: 500 })
  reason: string;

  @Prop({ required: true })
  admin_id: string;

  @Prop({ required: true })
  admin_name: string;

  @Prop({ required: true, trim: true, maxlength: 128 })
  idempotency_key: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 64 })
  idempotency_effect_hash: string;
}

export const WalletAdjustmentSchema =
  SchemaFactory.createForClass(WalletAdjustment);

WalletAdjustmentSchema.index(
  { user_id: 1, idempotency_key: 1 },
  {
    name: 'uniq_wallet_adjustment_user_command',
    unique: true,
    partialFilterExpression: {
      idempotency_key: { $exists: true, $type: 'string', $gt: '' },
    },
  },
);
