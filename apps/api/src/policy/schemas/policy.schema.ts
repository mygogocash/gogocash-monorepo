import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PolicyDocument = HydratedDocument<Policy>;

/**
 * Allow-list of locales the multi-language policy editor accepts. Adding a
 * new market = add it here AND to the corresponding lookup in
 * `gogocash_app/src/lib/countries/canonical.ts`.
 *
 * `th` and `en` are the primary markets at launch. `ja` is wired but its
 * customer-side text falls back via the §5 chain in
 * docs/POLICY_MULTILANG_PLAN.md until marketing populates it. `ko`/`zh` are
 * pre-allowed so admins can begin authoring before customer-side rendering
 * is wired.
 */
export const ALLOWED_POLICY_LOCALES = ['th', 'en', 'ja', 'ko', 'zh'] as const;
export type PolicyLocale = (typeof ALLOWED_POLICY_LOCALES)[number];

/**
 * One block of policy text (banner OR terms). Stored as a sub-document on
 * `Policy`. Translations is a plain object — Mongoose `Map` works but
 * serialises awkwardly through Express; plain objects are easier to read,
 * write, and round-trip through JSON.
 */
@Schema({ _id: false })
export class PolicyContent {
  /** The locale that authored this content first. Customer-side renderer
   *  uses it as the fallback when the user's locale is missing.
   *  Must be one of `ALLOWED_POLICY_LOCALES`. */
  @Prop({ type: String, required: true, default: 'th' })
  primary_locale: string;

  /** Locale-keyed text. e.g. `{ th: "...", en: "...", ja: "..." }`.
   *  Must contain at least one non-empty value (validated in service). */
  @Prop({ type: Object, required: true, default: {} })
  translations: Record<string, string>;

  /** Provenance — preserved for editor round-trip. Mirrors the V1 fields
   *  that lived on the legacy single-translation document. */
  @Prop({ type: String, required: false })
  content_source?: 'template' | 'template_plus' | 'custom';

  @Prop({ type: String, required: false })
  template_id?: string;

  /** Per-locale "additional terms" appended after a template body. Same
   *  locale keys as `translations`. */
  @Prop({ type: Object, required: false })
  additional_terms?: Record<string, string>;
}

export const PolicyContentSchema = SchemaFactory.createForClass(PolicyContent);

/**
 * Policy document — one per category. `category_id` is unique-indexed so a
 * category has at most one policy row; the `upsert` API enforces this at
 * write-time.
 */
@Schema({ timestamps: true, collection: 'policies' })
export class Policy {
  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
    unique: true,
    index: true,
  })
  category_id: Types.ObjectId;

  /** Short banner text shown above the offer list. */
  @Prop({ type: PolicyContentSchema, required: false })
  banner?: PolicyContent;

  /** Terms & conditions (long-form). */
  @Prop({ type: PolicyContentSchema, required: false })
  terms?: PolicyContent;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);
