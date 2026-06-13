import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MissingOrderDocument = HydratedDocument<MissingOrder>;

@Schema({ _id: false })
export class MissingOrderNote {
  @Prop({ required: true })
  admin_id: string;

  @Prop({ required: true })
  admin_name: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;
}

export const MissingOrderNoteSchema =
  SchemaFactory.createForClass(MissingOrderNote);

@Schema({ timestamps: true })
export class MissingOrder {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: Number })
  offer_id: number;

  @Prop({ required: true })
  offer_name: string;

  @Prop({ required: true })
  order_id: string;

  @Prop({ required: true, type: Date })
  order_date: Date;

  @Prop({ required: true, type: Number })
  order_amount: number;

  @Prop({ default: 'THB' })
  currency: string;

  @Prop({ default: 'pending', index: true })
  status: string; // pending | investigating | approved | rejected

  @Prop({ type: String, required: false })
  assigned_to: string;

  @Prop({ type: String, required: false })
  resolution_note: string;

  @Prop({ type: [MissingOrderNoteSchema], default: [] })
  notes: MissingOrderNote[];

  @Prop({ type: Date, required: false })
  resolved_at: Date;
}

export const MissingOrderSchema = SchemaFactory.createForClass(MissingOrder);
