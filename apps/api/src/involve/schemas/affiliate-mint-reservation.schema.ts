import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const AFFILIATE_MINT_RESERVATION_COLLECTION =
  'affiliate_mint_reservations';
export const AFFILIATE_MINT_RESERVATION_LEGACY_TTL_INDEX =
  'affiliate_mint_reservation_safe_expiry_v1';
export const AFFILIATE_MINT_RESERVATION_TTL_INDEX =
  'affiliate_mint_reservation_safe_expiry_v2';
export const AFFILIATE_MINT_RESERVATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export type AffiliateMintReservationStatus =
  | 'reserved'
  | 'pre_mint_failed'
  | 'provider_started'
  | 'provider_succeeded'
  | 'committed';

export type AffiliateMintReservationDocument =
  HydratedDocument<AffiliateMintReservation>;

@Schema({
  collection: AFFILIATE_MINT_RESERVATION_COLLECTION,
  autoIndex: false,
})
export class AffiliateMintReservation {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true, enum: ['involve'] })
  source: 'involve';

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ type: Number, required: true })
  offer_id: number;

  @Prop({ type: Number, required: true })
  merchant_id: number;

  @Prop({ type: String, required: true })
  destination_hash: string;

  @Prop({ type: String, required: true })
  destination_url: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'reserved',
      'pre_mint_failed',
      'provider_started',
      'provider_succeeded',
      'committed',
    ],
  })
  status: AffiliateMintReservationStatus;

  @Prop({ type: String, required: true })
  owner_token: string;

  @Prop({ type: String, required: true })
  attempt_token: string;

  @Prop({ type: Date, required: true })
  lease_expires_at: Date;

  @Prop({ type: Date })
  provider_started_at?: Date;

  @Prop({ type: Date })
  provider_succeeded_at?: Date;

  @Prop({ type: Date })
  committed_at?: Date;

  @Prop({ type: Date })
  pre_mint_failed_at?: Date;

  @Prop({ type: String })
  failure_code?: 'upstream_auth_failed';

  @Prop({ type: String })
  tracked_deeplink?: string;

  /**
   * Present only while provider work has not started or after safe completion.
   * Mongo's partial TTL predicate is a second guard against ever deleting an
   * uncertain provider-started result.
   */
  @Prop({ type: Date })
  expires_at?: Date;

  @Prop({ type: Date, required: true })
  created_at: Date;

  @Prop({ type: Date, required: true })
  updated_at: Date;
}

export const AffiliateMintReservationSchema = SchemaFactory.createForClass(
  AffiliateMintReservation,
);

AffiliateMintReservationSchema.index(
  { expires_at: 1 },
  {
    name: AFFILIATE_MINT_RESERVATION_TTL_INDEX,
    expireAfterSeconds: 0,
    partialFilterExpression: {
      status: { $in: ['reserved', 'committed', 'pre_mint_failed'] },
    },
  },
);
