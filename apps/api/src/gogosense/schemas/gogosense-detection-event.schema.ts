import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GogosenseDetectionEventDocument =
  HydratedDocument<GogosenseDetectionEvent>;

@Schema({ timestamps: true, collection: 'gogosense_detection_events' })
export class GogosenseDetectionEvent {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ required: true })
  detection_method: string;

  @Prop({ required: false, index: true })
  merchant_id?: string;

  @Prop({ required: false })
  merchant_name?: string;

  @Prop({ required: false })
  brand_slug?: string;

  @Prop({ required: false, type: Number })
  offer_id?: number;

  @Prop({ required: false, type: Number })
  network_merchant_id?: number;

  @Prop({ required: false })
  cashback_rate?: string;

  @Prop({ required: false, type: Number })
  confidence_score?: number;

  @Prop({ default: false })
  matched: boolean;

  @Prop({ required: false })
  package_name?: string;

  @Prop({ required: false })
  url?: string;

  @Prop({ required: false })
  notification_text?: string;

  @Prop({ required: false })
  screenshot_job_id?: string;

  @Prop({ required: true })
  observed_at: Date;

  @Prop({ required: true })
  platform: string;

  @Prop({ required: false })
  app_version?: string;

  @Prop({ required: true })
  recommended_action: string;
}

export const GogosenseDetectionEventSchema = SchemaFactory.createForClass(
  GogosenseDetectionEvent,
);

GogosenseDetectionEventSchema.index({ user_id: 1, observed_at: -1 });
GogosenseDetectionEventSchema.index({ user_id: 1, merchant_id: 1 });
