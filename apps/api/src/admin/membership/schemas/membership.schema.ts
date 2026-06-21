import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MembershipDocument = HydratedDocument<Membership>;

@Schema({ timestamps: true })
export class Membership {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: 'User',
    unique: true,
    index: true,
  })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'MembershipTier' })
  tier_id: Types.ObjectId;

  @Prop({ default: 'active' })
  status: string; // active | cancelled | expired

  @Prop({ type: Date, required: true })
  start_date: Date;

  @Prop({ type: Date, required: true })
  end_date: Date;

  @Prop({ type: Date, required: false, default: null })
  cancelled_at: Date;

  @Prop({ type: String, required: false, default: null })
  cancellation_reason: string;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
