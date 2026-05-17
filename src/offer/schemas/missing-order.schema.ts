import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MissionOrderDocument = HydratedDocument<MissionOrder>;

@Schema({ timestamps: true })
export class MissionOrder {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Offer' })
  offer_id: string;

  @Prop({ required: false })
  attachments: string[];

  @Prop({ required: false })
  orderId: string;

  @Prop({ required: false })
  purchaseDate: string;

  @Prop({ required: false })
  note: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ required: true, default: 'pending' })
  status: string;
}

export const MissionOrderSchema = SchemaFactory.createForClass(MissionOrder);
