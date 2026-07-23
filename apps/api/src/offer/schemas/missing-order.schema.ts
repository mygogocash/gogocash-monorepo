import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const MISSION_ORDER_COLLECTION = 'missionorders';
export const MISSION_ORDER_SCHEMA_VERSION = 2;
export const MISSION_ORDER_STATUSES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
] as const;
export type MissionOrderStatus = (typeof MISSION_ORDER_STATUSES)[number];

export type MissionOrderDocument = HydratedDocument<MissionOrder>;

@Schema({ _id: false })
export class MissionOrderCustomerSnapshot {
  @Prop({ type: String, required: false, default: null })
  name?: string | null;

  @Prop({ type: String, required: false, default: null })
  email?: string | null;

  @Prop({ type: String, required: false, default: null })
  phone?: string | null;
}

export const MissionOrderCustomerSnapshotSchema = SchemaFactory.createForClass(
  MissionOrderCustomerSnapshot,
);

@Schema({ _id: false })
export class MissionOrderOfferSnapshot {
  @Prop({ required: true })
  source: string;

  @Prop({ required: true, type: Number })
  provider_offer_id: number;

  @Prop({ required: true })
  name: string;
}

export const MissionOrderOfferSnapshotSchema = SchemaFactory.createForClass(
  MissionOrderOfferSnapshot,
);

@Schema({ _id: false })
export class MissionOrderNote {
  @Prop({ required: true })
  admin_id: string;

  @Prop({ required: true })
  admin_name: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: Date, default: () => new Date() })
  created_at: Date;
}

export const MissionOrderNoteSchema =
  SchemaFactory.createForClass(MissionOrderNote);

@Schema({ timestamps: true, collection: MISSION_ORDER_COLLECTION })
export class MissionOrder {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Offer' })
  offer_id: Types.ObjectId;

  @Prop({ type: MissionOrderCustomerSnapshotSchema, required: false })
  customer_snapshot?: MissionOrderCustomerSnapshot;

  @Prop({ type: MissionOrderOfferSnapshotSchema, required: false })
  offer_snapshot?: MissionOrderOfferSnapshot;

  @Prop({ required: false })
  order_id?: string;

  @Prop({ required: false, type: Date })
  purchase_date?: Date;

  @Prop({ required: false, type: Number })
  order_amount?: number;

  @Prop({ required: false, default: 'THB' })
  currency?: string;

  @Prop({ required: false, default: '' })
  remarks?: string;

  @Prop({ type: [String], default: [] })
  evidence_refs: string[];

  @Prop({ type: [MissionOrderNoteSchema], default: [] })
  notes: MissionOrderNote[];

  @Prop({ type: String, required: false, default: null })
  assigned_to?: string | null;

  @Prop({ type: String, required: false, default: null })
  resolution_note?: string | null;

  @Prop({ type: String, required: false, default: null })
  rejection_reason?: string | null;

  @Prop({ type: Date, required: false, default: null })
  resolved_at?: Date | null;

  @Prop({ required: true, default: MISSION_ORDER_SCHEMA_VERSION })
  schema_version: number;

  @Prop({ required: false, immutable: true })
  legacy_collection?: string;

  @Prop({ required: false, immutable: true })
  legacy_id?: string;

  @Prop({ required: false, immutable: true })
  dedupe_key?: string;

  @Prop({ required: false })
  migration_checksum?: string;

  @Prop({ type: Date, required: false })
  source_updated_at?: Date;

  @Prop({ type: Date, required: false })
  migrated_at?: Date;

  @Prop({ required: false })
  seed_marker?: string;

  @Prop({ required: false })
  seed_record_key?: string;

  /** Legacy customer fields remain readable until the guarded migration runs. */
  @Prop({ required: false })
  attachments: string[];

  @Prop({ required: false })
  orderId: string;

  @Prop({ required: false })
  purchaseDate: string;

  @Prop({ required: false })
  note: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    default: 'pending',
    enum: MISSION_ORDER_STATUSES,
    index: true,
  })
  status: MissionOrderStatus;

  @Prop({ required: false })
  amount?: string;
}

export const MissionOrderSchema = SchemaFactory.createForClass(MissionOrder);

MissionOrderSchema.index(
  { legacy_collection: 1, legacy_id: 1 },
  {
    name: 'missionorder_migration_provenance_unique',
    unique: true,
    partialFilterExpression: {
      legacy_collection: { $exists: true },
      legacy_id: { $exists: true },
    },
  },
);
MissionOrderSchema.index(
  { dedupe_key: 1 },
  {
    name: 'missionorder_dedupe_key_unique',
    unique: true,
    partialFilterExpression: { dedupe_key: { $type: 'string' } },
  },
);
MissionOrderSchema.index(
  { seed_record_key: 1 },
  {
    name: 'missionorder_seed_record_key_unique',
    unique: true,
    partialFilterExpression: { seed_record_key: { $type: 'string' } },
  },
);
