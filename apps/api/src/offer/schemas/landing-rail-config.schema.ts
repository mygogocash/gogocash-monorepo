import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  TopBrandEntry,
  TopBrandEntrySchema,
} from './top-brand-config.schema';

export type LandingRailConfigDocument = HydratedDocument<LandingRailConfig>;

/**
 * One curated homepage brand rail ("Trending Brands", "Travel Deals are
 * Here!", "Makeup Must Have!"). Mirrors the Top brands config
 * ({@link TopBrandConfig}) but is a per-rail document keyed by a stable
 * `railId` slug, stored in its own `landingrailconfigs` collection so it never
 * collides with the singleton top-brand / banner docs.
 *
 * Each rail reuses the top-brand device-list shape ({@link TopBrandEntry}):
 * `brandsDesktop` / `brandsMobile` allow independent order per device and
 * legacy `brands` is the fallback when a device list is unset. Cashback is
 * never trusted at write time — it is recomputed from live offer economics on
 * read.
 */
@Schema({ timestamps: true, collection: 'landingrailconfigs' })
export class LandingRailConfig {
  /** Stable slug identity the admin panel and customer app curate by. */
  @Prop({ required: true, unique: true, index: true })
  railId: string;

  /** Customer-facing rail heading (e.g. "Trending Brands"). */
  @Prop({ default: '' })
  title: string;

  /** Optional leading emoji shown before the title (e.g. "✈️"). */
  @Prop({ default: '' })
  emoji: string;

  /** "See all" destination (e.g. "/category/Travel"). */
  @Prop({ default: '' })
  link: string;

  /** Customer card visual variant. */
  @Prop({ default: 'brandLogoBadge' })
  cardVariant: string;

  /** Ascending display order across rails (first = topmost). */
  @Prop({ default: 0 })
  position: number;

  /** When false the rail is hidden from the customer homepage. */
  @Prop({ default: true })
  enabled: boolean;

  /** Legacy / fallback ordered list (mirrored from desktop on save). */
  @Prop({ type: [TopBrandEntrySchema], default: [] })
  brands: TopBrandEntry[];

  /** Desktop homepage order. Absent ⇒ fall back to `brands`. */
  @Prop({ type: [TopBrandEntrySchema], required: false })
  brandsDesktop?: TopBrandEntry[];

  /** Mobile homepage order. Absent ⇒ fall back to `brands`. */
  @Prop({ type: [TopBrandEntrySchema], required: false })
  brandsMobile?: TopBrandEntry[];
}

export const LandingRailConfigSchema =
  SchemaFactory.createForClass(LandingRailConfig);
