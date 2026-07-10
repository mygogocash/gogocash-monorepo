import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type InventoryReservationDocument =
  HydratedDocument<InventoryReservation>;
export type InventoryReservationStatus = 'active' | 'committed' | 'released';

@Schema({ collection: 'commerce_inventory_reservations', timestamps: true })
export class InventoryReservation {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'CatalogProduct',
    required: true,
    index: true,
  })
  product_id!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'CommerceOrder',
    required: true,
    index: true,
  })
  order_id!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  user_id!: string;

  @Prop({ required: true, trim: true })
  variant_sku!: string;

  @Prop({ required: true, min: 1 })
  quantity!: number;

  @Prop({
    type: String,
    default: 'active',
    enum: ['active', 'committed', 'released'],
    index: true,
  })
  status!: InventoryReservationStatus;

  @Prop({ type: Date, required: true, index: true })
  expires_at!: Date;
}

export const InventoryReservationSchema =
  SchemaFactory.createForClass(InventoryReservation);

InventoryReservationSchema.index({ product_id: 1, variant_sku: 1, status: 1 });
