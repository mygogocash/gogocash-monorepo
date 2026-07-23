import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TopBrandConfigDocument = HydratedDocument<TopBrandConfig>;

/** One ordered top-brands entry. Cashback is a legacy field and is no longer trusted. */
@Schema({ _id: false })
export class TopBrandEntry {
  // Offer Mongo _id (the identity the admin panel curates by).
  @Prop({ required: true })
  offerId: string;

  @Prop({ default: '' })
  cashback: string;
}

export const TopBrandEntrySchema = SchemaFactory.createForClass(TopBrandEntry);

/**
 * Homepage "top brands" merchandising config. A single (singleton) document.
 * Legacy `brands` remains the fallback when device lists are unset.
 * `brandsDesktop` / `brandsMobile` (#378 Phase 2) allow independent order per
 * device. Stored in its own collection so it never collides with the
 * image-banner doc read by OfferService.getBannerHome().
 */
@Schema({ timestamps: true })
export class TopBrandConfig {
  /** Legacy / fallback ordered list (also mirrored from desktop on dual save). */
  @Prop({ type: [TopBrandEntrySchema], default: [] })
  brands: TopBrandEntry[];

  /** Desktop homepage order. Absent ⇒ fall back to `brands`. */
  @Prop({ type: [TopBrandEntrySchema], required: false })
  brandsDesktop?: TopBrandEntry[];

  /** Mobile homepage order. Absent ⇒ fall back to `brands`. */
  @Prop({ type: [TopBrandEntrySchema], required: false })
  brandsMobile?: TopBrandEntry[];
}

export const TopBrandConfigSchema =
  SchemaFactory.createForClass(TopBrandConfig);
