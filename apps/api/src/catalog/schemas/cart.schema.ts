import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CartDocument = HydratedDocument<Cart>;
export type CartStatus = 'active' | 'converted' | 'abandoned';

@Schema({ _id: false })
export class CartItem {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'CatalogProduct',
    required: true,
  })
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

@Schema({ collection: 'commerce_carts', timestamps: true })
export class Cart {
  @Prop({ required: true, index: true, trim: true })
  user_id!: string;

  @Prop({ type: [CartItem], default: [] })
  items!: CartItem[];

  @Prop({
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3,
    default: 'THB',
  })
  currency!: string;

  @Prop({ required: true, min: 0, default: 0 })
  subtotal_amount!: number;

  @Prop({
    default: 'active',
    enum: ['active', 'converted', 'abandoned'],
    index: true,
  })
  status!: CartStatus;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ user_id: 1, status: 1 });
