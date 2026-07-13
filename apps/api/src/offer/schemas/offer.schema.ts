import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type OfferDocument = HydratedDocument<Offer>;

/** Affiliate network the offer was ingested from (or `'manual'` for admin-created brands). */
export type OfferSource = 'involve' | 'optimise' | 'manual';

/** Admin curation state. `'approved'` is the default so legacy Involve offers stay visible. */
export type OfferStatus = 'pending_review' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class Offer {
  /**
   * Network-scoped identifier from the upstream affiliate provider.
   * Uniqueness is enforced by the compound index `{ source, offer_id }` below —
   * different networks may happen to use the same numeric id.
   */
  @Prop({ required: true })
  offer_id: number;

  @Prop({ required: true })
  merchant_id: number;

  @Prop({ required: true })
  offer_name: string;

  @Prop()
  description: string;

  @Prop()
  preview_url: string;

  @Prop({ default: 0 })
  is_require_approval: number;

  @Prop()
  currency: string;

  @Prop()
  logo: string;

  @Prop()
  lookup_value: string;

  @Prop()
  validation_terms: number;

  @Prop()
  payment_terms: number;

  /**
   * Cashback tracking-period config (customer "Tracking/Confirm within N day"
   * strip). 'auto' derives the confirm window from validation_terms; 'manual'
   * uses the admin-entered day counts below. Resolution lives in
   * tracking-period.util.ts — these raw fields never reach public payloads.
   */
  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  tracking_period_mode: 'auto' | 'manual';

  @Prop()
  tracking_days?: number;

  @Prop()
  confirm_days?: number;

  @Prop()
  datetime_updated: Date;

  @Prop()
  datetime_created: Date;

  @Prop({ default: false })
  marketplace_store_offer: boolean;

  @Prop()
  categories: string;

  @Prop()
  countries: string;

  @Prop()
  commissions: { [key: string]: string }[];

  @Prop()
  special_commissions: any[]; // Adjust type if specific structure is known

  @Prop()
  tracking_link: string;

  @Prop()
  commission_tracking: string;

  @Prop()
  tracking_type: string;

  @Prop()
  directory_page: string;

  @Prop()
  logo_desktop: string;

  @Prop()
  logo_mobile: string;

  @Prop()
  offer_name_display: string;

  @Prop()
  banner: string;

  @Prop()
  logo_circle: string;

  @Prop()
  disabled: boolean;

  @Prop()
  commission_store: number;

  @Prop()
  max_cap: number;

  @Prop()
  banner_mobile: string;

  @Prop()
  type: string; // old / new

  @Prop()
  extra_store: boolean;

  @Prop()
  extra_store_sort: number;

  @Prop({ default: 1 })
  extra_point: number;

  @Prop()
  product_type: { [key: string]: string }[];

  /**
   * Affiliate network of origin. `'involve'` default keeps every pre-existing
   * document valid without a backfill migration.
   */
  @Prop({
    type: String,
    default: 'involve',
    enum: ['involve', 'optimise', 'manual'],
  })
  source: OfferSource;

  /**
   * Admin curation state. `'approved'` default preserves visibility of every
   * legacy Involve offer after this schema change — no migration needed.
   * Optimise sync writes `'pending_review'` on newly-seen offers.
   */
  @Prop({
    type: String,
    default: 'approved',
    enum: ['pending_review', 'approved', 'rejected'],
  })
  status: OfferStatus;

  /** Admin user id of the last reviewer (approve/reject). */
  @Prop()
  reviewed_by?: string;

  /** Timestamp of the last review action. */
  @Prop()
  reviewed_at?: Date;

  /** Reason provided when rejecting; cleared on approve. */
  @Prop()
  rejection_reason?: string;

  /**
   * FK to the parent `brands` collection. Multiple offers (one per country variant)
   * point at the same brand id; the customer-app visibility filter and the admin
   * grouped table both rely on this for clean per-brand grouping.
   *
   * Optional during the migration window — legacy rows without `brand_id` keep
   * working via the customer-side dedupe heuristic (`merchant_id` then `lookup_value` stem).
   * The migration script `scripts/migrate-brands.ts` backfills this field.
   */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand' })
  brand_id?: Types.ObjectId;

  /**
   * Whether this brand is visible to customers in every country regardless of variant.
   * Denormalized from the parent `Brand.is_global` for fast filtering at the offer-list
   * query path (avoids a join on the hottest customer-facing endpoint). Kept in sync
   * by `BrandService.update`.
   */
  @Prop({ default: false })
  is_global: boolean;

  /**
   * Fallback country variant for global brands. Same denormalization rationale as
   * `is_global` — kept in sync by `BrandService.update`.
   */
  @Prop()
  default_country?: string;

  /** Category whose authored policy seeds T&C when custom_terms is empty. */
  @Prop()
  policy_category_id?: string;

  /** Merchant-specific terms shown on the shop detail page. */
  @Prop()
  custom_terms?: string;

  /** Optional note surfaced to end users on the shop detail page. */
  @Prop()
  note_to_user?: string;

  /** GoGoCash app tracking link (Commission Management / Create Brand). */
  @Prop()
  app_deeplink?: string;

  /** Admin-controlled offer card / listing tags (merchandising). */
  @Prop({ type: Object })
  offer_display_tags?: {
    brand_category_enabled: boolean;
    brand_category_label: string;
    extra_cashback_tag: boolean;
    grab_coupon_tag: boolean;
    expire_in_days_enabled: boolean;
    expire_in_days: number | null;
  };
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

/**
 * Unique per (source, offer_id). Replaces the former single-field unique index on
 * `offer_id`, which would reject Optimise campaigns that happen to share a numeric
 * id with an Involve offer. Run-time migration is a sub-second re-index on the
 * current collection size.
 */
OfferSchema.index({ source: 1, offer_id: 1 }, { unique: true });

/** Fast lookups for admin Pending tab and customer-app visibility filter. */
OfferSchema.index({ status: 1 });
OfferSchema.index({ source: 1, status: 1 });

/** Brand-grouping queries: list every variant of a brand, or filter by brand+country. */
OfferSchema.index({ brand_id: 1 });
OfferSchema.index({ brand_id: 1, countries: 1 });

/**
 * One variant per (brand, country) — guarantees a TH user can't accidentally see two
 * Apple TH rows. Sparse so legacy offers without `brand_id` aren't constrained until
 * the migration backfills them.
 */
OfferSchema.index(
  { brand_id: 1, countries: 1 },
  { unique: true, sparse: true },
);
