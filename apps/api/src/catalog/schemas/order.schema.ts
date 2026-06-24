import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CommerceOrderDocument = HydratedDocument<CommerceOrder>;
export type CommerceOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'fulfilled'
  | 'cancelled'
  | 'refunded';
export type CommercePaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

@Schema({ _id: false })
export class CommerceOrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CatalogProduct', required: true })
  product_id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  variant_sku!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({ required: true, min: 0 })
  unit_amount!: number;

  @Prop({ required: true, uppercase: true, minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ trim: true })
  image_url?: string;
}

@Schema({ collection: 'commerce_orders', timestamps: true })
export class CommerceOrder {
  @Prop({ required: true, unique: true, index: true, trim: true })
  order_number!: string;

  @Prop({ required: true, index: true, trim: true })
  user_id!: string;

  @Prop({ type: [CommerceOrderItem], default: [] })
  items!: CommerceOrderItem[];

  @Prop({ required: true, uppercase: true, minlength: 3, maxlength: 3, default: 'THB' })
  currency!: string;

  @Prop({ required: true, min: 0 })
  subtotal_amount!: number;

  @Prop({ required: true, min: 0 })
  total_amount!: number;

  @Prop({ default: 'pending_payment', enum: ['pending_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded'], index: true })
  status!: CommerceOrderStatus;

  @Prop({ default: 'unpaid', enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'], index: true })
  payment_status!: CommercePaymentStatus;

  @Prop({ default: 'stripe', trim: true })
  payment_provider!: string;

  @Prop({ trim: true, index: true })
  checkout_session_id?: string;

  @Prop({ type: Object, default: {} })
  shipping_address!: Record<string, unknown>;

  @Prop({ trim: true })
  admin_note?: string;

  @Prop({ type: Date })
  paid_at?: Date;

  @Prop({ type: Date })
  fulfilled_at?: Date;
}

export const CommerceOrderSchema = SchemaFactory.createForClass(CommerceOrder);

CommerceOrderSchema.index({ user_id: 1, createdAt: -1 });
CommerceOrderSchema.index({ status: 1, payment_status: 1 });
