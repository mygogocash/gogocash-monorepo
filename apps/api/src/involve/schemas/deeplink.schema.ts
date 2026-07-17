import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeeplinkDocument = HydratedDocument<Deeplink>;
@Schema({ timestamps: true, autoIndex: false })
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
  /** Canonical coupon/product target used when the provider link was minted. */
  @Prop({ type: String, required: false })
  destination_url?: string;
  /** SHA-256 of destination_url; optional only for pre-migration legacy rows. */
  @Prop({ type: String, required: false })
  destination_hash?: string;
}

export const DeeplinkSchema = SchemaFactory.createForClass(Deeplink);

/**
 * Declared for schema/tooling visibility but never auto-created. InvolveService
 * performs a duplicate preflight and creates it asynchronously; legacy
 * duplicates therefore cannot make application bootstrap fail.
 * The bounded key uses the destination hash to stay below Mongo's index-key
 * limit. The service also compares the persisted full canonical URL and fails
 * closed if a hash lookup ever returns a different destination.
 */
DeeplinkSchema.index(
  {
    source: 1,
    user_id: 1,
    offer_id: 1,
    merchant_id: 1,
    destination_hash: 1,
  },
  {
    name: 'affiliate_destination_identity_unique_v1',
    unique: true,
    partialFilterExpression: {
      destination_hash: { $type: 'string' },
      source: { $type: 'string' },
    },
  },
);
