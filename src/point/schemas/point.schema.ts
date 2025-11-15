import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PointDocument = HydratedDocument<Point>;

@Schema({ timestamps: true })
export class Point {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  conversion_id: number;

  @Prop({ required: true })
  point: number;

  @Prop({ required: true })
  type: string; // add, remove
}

export const PointSchema = SchemaFactory.createForClass(Point);
