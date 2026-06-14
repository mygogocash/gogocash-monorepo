import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BrandDocument = HydratedDocument<Brand>;

/**
 * Brand parent entity that groups country-specific Offer variants.
 *
 * Example: a single `Brand("Apple", slug=apple)` doc owns multiple offer rows
 * — `Apple TH` (Involve, THB tracking link) and `Apple SG` (Optimise, SGD tracking link).
 * The customer app filters discovery surfaces with the rule:
 *
 *     visible = (offer.country == user.country) OR brand.is_global
 *
 * When `is_global=true` and a customer's country has no dedicated Offer variant,
 * the resolver falls back to the variant whose country matches `default_country`.
 */
@Schema({ timestamps: true, collection: 'brands' })
export class Brand {
  /**
   * Display name shown in admin lists and customer cards.
   * NOT unique — country-suffix variants ("Apple", "Apple Inc.") may legitimately differ.
   */
  @Prop({ required: true, trim: true })
  brand_name: string;

  /**
   * URL-safe identifier (lowercase, alphanumeric, underscore-separated).
   * Unique across the collection — used for grouping variants and for `/brand/:slug` lookups.
   */
  @Prop({ required: true, trim: true, lowercase: true })
  brand_slug: string;

  /**
   * Default country variant when a global brand is opened by a user whose country has
   * no dedicated tracking line. Stored as the `countries` value (e.g. `Thailand`) so
   * it matches the existing `Offer.countries` field used by the visibility helpers.
   */
  @Prop({ required: false, trim: true })
  default_country?: string;

  /**
   * When `true` the brand is visible to customers in every country, regardless of whether
   * a country-specific variant exists. The customer app applies the visibility filter
   * (per-country match OR is_global) at the discovery layer.
   */
  @Prop({ default: false })
  is_global: boolean;

  /** Shared logo (square / circle / banner). Variants may override per-country. */
  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  logo_circle: string;

  @Prop({ default: '' })
  banner: string;

  /** Internal-facing description, optional. */
  @Prop({ default: '' })
  description: string;

  /**
   * Free-form category list shared across variants (e.g. `Electronics, Travel`).
   * Per-variant categories on Offer documents take precedence in customer search.
   */
  @Prop({ default: '' })
  categories: string;

  /**
   * Soft-delete flag. When `true` the brand is hidden from listings but its variants
   * remain in the offers collection (the variant resolver also drops them).
   */
  @Prop({ default: false })
  disabled: boolean;
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

/**
 * Slug uniqueness — one brand per `brand_slug`. Country variants share the slug
 * via the offer's `lookup_value` (e.g. `apple_th`) and the offer's `brand_id` FK.
 */
BrandSchema.index({ brand_slug: 1 }, { unique: true });

/** Fast filtering for admin list views (e.g. show only enabled global brands). */
BrandSchema.index({ disabled: 1 });
BrandSchema.index({ is_global: 1 });
