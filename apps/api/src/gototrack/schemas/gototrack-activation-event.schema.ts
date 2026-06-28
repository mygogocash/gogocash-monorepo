import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GototrackActivationEventDocument =
  HydratedDocument<GototrackActivationEvent>;

@Schema({ timestamps: true, collection: 'gogosense_activation_events' })
export class GototrackActivationEvent {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: false, index: true })
  detection_event_id?: string;

  @Prop({ required: true, index: true })
  merchant_id: string;

  @Prop({ required: true, type: Number })
  offer_id: number;

  @Prop({ required: true, type: Number })
  network_merchant_id: number;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  deeplink: string;

  @Prop({ required: false })
  expires_at?: Date;
}

export const GototrackActivationEventSchema = SchemaFactory.createForClass(
  GototrackActivationEvent,
);

GototrackActivationEventSchema.index({ user_id: 1, createdAt: -1 });
