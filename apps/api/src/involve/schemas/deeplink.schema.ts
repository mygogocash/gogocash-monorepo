import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeeplinkDocument = HydratedDocument<Deeplink>;
@Schema({ timestamps: true })
export class Deeplink {
  @Prop({ type: Number, required: true })
  offer_id: number;
  @Prop({ type: Number, required: true })
  merchant_id: number;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;
  @Prop({ type: String, required: true })
  deeplink: string;
  @Prop({ type: [Date], required: false })
  click_date: Date[];
  /**
   * Affiliate network that issued this tracking link. `'involve'` default keeps
   * every pre-existing deeplink valid without a backfill migration; new-network
   * deeplinks stamp their own source ('optimise' / 'accesstrade').
   */
  @Prop({ type: String, default: 'involve' })
  source: string;
}

export const DeeplinkSchema = SchemaFactory.createForClass(Deeplink);
