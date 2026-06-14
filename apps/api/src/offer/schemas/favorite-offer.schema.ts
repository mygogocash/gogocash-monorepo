import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FavoriteOfferDocument = HydratedDocument<FavoriteOffer>;

@Schema({ timestamps: true })
export class FavoriteOffer {
  @Prop({ type: Types.ObjectId, ref: 'Offer' })
  offer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user_id: Types.ObjectId;
}

export const FavoriteOfferSchema = SchemaFactory.createForClass(FavoriteOffer);
