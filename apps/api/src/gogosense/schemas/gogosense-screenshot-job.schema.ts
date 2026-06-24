import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GogosenseScreenshotJobDocument =
  HydratedDocument<GogosenseScreenshotJob>;

@Schema({ timestamps: true, collection: 'gogosense_screenshot_jobs' })
export class GogosenseScreenshotJob {
  @Prop({ required: true, index: true })
  user_id: string;

  @Prop({ default: 'pending' })
  status: 'pending' | 'processing' | 'matched' | 'manual_review' | 'failed';

  @Prop({ required: false })
  upload_url?: string;

  @Prop({ required: false })
  extracted_text?: string;

  @Prop({ required: false })
  merchant_id?: string;

  @Prop({ required: false, type: Number })
  confidence_score?: number;

  @Prop({ required: true, type: Date, index: true })
  expires_at: Date;
}

export const GogosenseScreenshotJobSchema = SchemaFactory.createForClass(
  GogosenseScreenshotJob,
);

GogosenseScreenshotJobSchema.index({ user_id: 1, createdAt: -1 });
GogosenseScreenshotJobSchema.index({ user_id: 1, expires_at: 1 });
