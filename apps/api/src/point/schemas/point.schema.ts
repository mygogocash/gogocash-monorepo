import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PointDocument = HydratedDocument<Point>;

@Schema({ timestamps: true })
export class Point {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ required: false })
  conversion_id: number;

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  referral_id: Types.ObjectId;

  @Prop({ required: true })
  point: number;

  @Prop({ required: true })
  type: string; // add, remove

  @Prop({ required: true })
  action: string; // signup, referral, purchase

  /**
   * Durable business-effect identity. Legacy rows intentionally have no key;
   * the partial unique index therefore does not reinterpret historical absence
   * as proof that a payout is missing.
   */
  @Prop({ type: String, required: false })
  idempotency_key?: string;
}

export const PointSchema = SchemaFactory.createForClass(Point);
PointSchema.index(
  { idempotency_key: 1 },
  {
    name: 'uniq_point_idempotency_key',
    unique: true,
    partialFilterExpression: {
      idempotency_key: { $type: 'string', $gt: '' },
    },
  },
);
