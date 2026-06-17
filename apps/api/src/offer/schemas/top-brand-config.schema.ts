import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TopBrandConfigDocument = HydratedDocument<TopBrandConfig>;

/** One ordered top-brands entry: which offer, and the admin-set cashback label. */
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
 * Homepage "top brands" merchandising config. A single (singleton) document:
 * `brands` is the admin-curated, ordered list shown on the customer home.
 * Stored in its own collection so it never collides with the image-banner doc
 * read by OfferService.getBannerHome() (unfiltered findOne on `banners`).
 */
@Schema({ timestamps: true })
export class TopBrandConfig {
  @Prop({ type: [TopBrandEntrySchema], default: [] })
  brands: TopBrandEntry[];
}

export const TopBrandConfigSchema =
  SchemaFactory.createForClass(TopBrandConfig);
