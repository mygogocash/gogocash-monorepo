import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

// #586 / #504 — Shopee Commission Xtra shops synced from the Involve Publisher
// API (`POST /shopeextra/all`). Distinct from the commerce `catalog_products`
// collection (REQ-DM-8): these are cashback/affiliate shops, never Stripe items.
export const INVOLVE_SHOP_COLLECTION = 'involve_shops';

// Source scope for idempotent upsert + soft-delete (REQ-DM-1). Only Shopee Xtra
// in v1, so `marketplace` is a constant too.
export const INVOLVE_SHOP_SOURCE = 'involve_shopeextra' as const;
export const INVOLVE_SHOP_MARKETPLACE = 'shopee' as const;
export const INVOLVE_SHOP_TYPES = ['mall', 'preferred'] as const;
export type InvolveShopType = (typeof INVOLVE_SHOP_TYPES)[number];

export type InvolveShopDocument = HydratedDocument<InvolveShop>;

@Schema({ collection: INVOLVE_SHOP_COLLECTION, timestamps: true })
export class InvolveShop {
  // Source-scope key for upsert/soft-delete; constant in v1 but stored so the
  // dedupe/active-sweep queries stay source-scoped as more sources are added.
  @Prop({ required: true, trim: true, default: INVOLVE_SHOP_SOURCE })
  source!: string;

  // Involve `shop_id` — the dedupe key (paired with `source`).
  @Prop({ required: true })
  shopId!: number;

  @Prop({ required: true, trim: true, default: INVOLVE_SHOP_MARKETPLACE })
  marketplace!: string;

  @Prop({ required: true, trim: true })
  shopName!: string;

  @Prop({ type: String, enum: INVOLVE_SHOP_TYPES })
  shopType?: InvolveShopType;

  @Prop({ required: true, trim: true })
  shopLink!: string;

  @Prop({ trim: true })
  shopImage?: string;

  @Prop({ type: [String], default: [] })
  shopBanner!: string[];

  // e.g. "Shopee Thailand" — used to resolve `offerId` (REQ-DM-3).
  @Prop({ trim: true })
  parentOfferName?: string;

  // Resolved ObjectId of the synced Shopee Offer, or null when none matches.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Offer', default: null })
  offerId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  country!: string;

  // Numeric fraction parsed from `commission_rate` ("0.0150" -> 0.015). Display
  // percent = cashbackRate * 100 (REQ-DM-2). Never stored as NaN.
  @Prop({ required: true })
  cashbackRate!: number;

  // Raw `commission_rate` string kept for audit.
  @Prop({ trim: true })
  commissionRateRaw?: string;

  @Prop({ type: Date })
  periodStart?: Date;

  // Serving cut-off: a row is served only when active AND now <= periodEnd.
  @Prop({ type: Date })
  periodEnd?: Date;

  // Pre-minted affiliate URL (REQ-ATTR-1) — no /deeplink/generate for this surface.
  @Prop({ required: true, trim: true })
  trackingLink!: string;

  // Maps to a CATEGORY_ICON_KEYS member; `/shopeextra/all` rows carry no
  // category, so this is null and the badge falls back to shopType (REQ-DM-4).
  @Prop({ type: String, default: null })
  categoryKey?: string | null;

  // Change-detection hash over the mapped row.
  @Prop({ trim: true })
  sourceHash?: string;

  @Prop({ type: Date })
  syncedAt?: Date;

  // Soft-delete flag: rows absent from the latest full feed flip to false and
  // stop serving; never hard-deleted (REQ-SYNC-3).
  @Prop({ default: true })
  active!: boolean;
}

export const InvolveShopSchema = SchemaFactory.createForClass(InvolveShop);

// REQ-DM-5 indexes: dedupe uniqueness + index-backed serving queries.
InvolveShopSchema.index({ source: 1, shopId: 1 }, { unique: true });
InvolveShopSchema.index({ marketplace: 1, country: 1, active: 1 });
InvolveShopSchema.index({ cashbackRate: -1 });
InvolveShopSchema.index({ shopName: 'text' });
// #503 — platform-scoped rail (GET /explore/shops?platformOfferId=…).
InvolveShopSchema.index({ offerId: 1, active: 1 });
