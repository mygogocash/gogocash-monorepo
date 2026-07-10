import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const PAYMENT_ATTEMPT_STATUSES = [
  'created',
  'pending',
  'succeeded',
  'failed',
  'expired',
  'refunded',
] as const;

export type PaymentAttemptDocument = HydratedDocument<PaymentAttempt>;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

@Schema({ collection: 'commerce_payment_attempts', timestamps: true })
export class PaymentAttempt {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'CommerceOrder',
    required: true,
    index: true,
  })
  order_id!: Types.ObjectId;

  @Prop({ required: true, index: true, trim: true })
  user_id!: string;

  @Prop({ required: true, trim: true, default: 'stripe' })
  provider!: string;

  @Prop({ trim: true, index: true })
  provider_session_id?: string;

  @Prop({ trim: true })
  checkout_url?: string;

  @Prop({ required: true, index: true, trim: true })
  idempotency_key!: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ required: true, uppercase: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({
    type: String,
    default: 'created',
    enum: PAYMENT_ATTEMPT_STATUSES,
    index: true,
  })
  status!: PaymentAttemptStatus;

  @Prop({ type: [String], default: [] })
  provider_event_ids!: string[];
}

export const PaymentAttemptSchema =
  SchemaFactory.createForClass(PaymentAttempt);

PaymentAttemptSchema.index({ provider: 1, provider_session_id: 1 });
PaymentAttemptSchema.index(
  { user_id: 1, idempotency_key: 1 },
  { unique: true },
);
