import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DataExportRequestDocument = HydratedDocument<DataExportRequest>;

export type DataExportDelivery = 'attachment' | 'link';
export type DataExportStatus = 'sent' | 'failed';

@Schema({ timestamps: true, collection: 'data-export-request' })
export class DataExportRequest {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  requestedAt: Date;

  @Prop({ type: String, enum: ['attachment', 'link'], required: false })
  delivery?: DataExportDelivery;

  @Prop({
    type: String,
    enum: ['sent', 'failed'],
    required: true,
    default: 'sent',
  })
  status: DataExportStatus;

  @Prop({ type: Number, required: false })
  sizeBytes?: number;
}

export const DataExportRequestSchema =
  SchemaFactory.createForClass(DataExportRequest);

DataExportRequestSchema.index({ userId: 1, requestedAt: -1 });
