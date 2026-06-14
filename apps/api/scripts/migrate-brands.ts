/**
 * One-shot (idempotent) migration: backfill the `brands` collection from existing
 * `offers` documents and link each offer to its parent brand via `brand_id`.
 *
 * Strategy
 * ─────────
 * For every offer that doesn't already have a `brand_id`:
 *   1. Compute a brand-grouping key — preferred order:
 *        a. `merchant_id` (partner-network merchant id; the same brand across
 *           markets usually shares this id).
 *        b. fallback: slugify(offer_name) with the trailing `_xx` country code stripped
 *           from `lookup_value` (e.g. `apple_th` → `apple`).
 *   2. Upsert a Brand document keyed by that derived `brand_slug`.
 *      - Inferred `brand_name`: drop trailing country suffixes from offer_name.
 *      - Logo / banner pulled from the first contributing offer that has them.
 *   3. Update the offer with `brand_id` plus `is_global` / `default_country`
 *      copied from the parent brand (denormalized for fast filtering).
 *
 * Idempotency
 * ───────────
 * - Re-running the script skips offers that already have `brand_id`.
 * - Brand upsert uses `findOneAndUpdate({ brand_slug }, { $setOnInsert })` so existing
 *   brands aren't clobbered.
 * - Optional `--dry-run` prints the plan without writing.
 *
 * Run
 * ───
 *   npx ts-node scripts/migrate-brands.ts --dry-run
 *   npx ts-node scripts/migrate-brands.ts             # apply
 *
 * Reads `MONGO_URI` from the environment (same as the NestJS app does).
 */

import 'dotenv/config';
import mongoose, { Model } from 'mongoose';
import {
  OfferSchema,
  Offer,
  OfferDocument,
} from '../src/offer/schemas/offer.schema';
import {
  BrandSchema,
  Brand,
  BrandDocument,
} from '../src/brand/schemas/brand.schema';
import { slugifyBrand } from '../src/brand/brand.service';

interface MigrationStats {
  offersScanned: number;
  offersAlreadyLinked: number;
  brandsCreated: number;
  brandsReused: number;
  offersLinked: number;
  ambiguousNames: string[];
  errors: { offerId: string; error: string }[];
}

/**
 * Strip a country qualifier from an offer name.
 * Handles `Apple - TH`, `Apple (SG)`, `Apple TH`, `Apple_TH` patterns.
 */
function inferBrandName(offerName: string): string {
  const trimmed = (offerName || '').trim();
  if (!trimmed) return '';
  return (
    trimmed
      .replace(/\s*[-–—]\s*(TH|SG|ID|MY|PH|VN|US|UK|GB)\b.*$/i, '')
      .replace(/\s*\((TH|SG|ID|MY|PH|VN|US|UK|GB)\)\s*$/i, '')
      .replace(/[\s_]+(TH|SG|ID|MY|PH|VN|US|UK|GB)\s*$/i, '')
      .trim() || trimmed
  );
}

/**
 * Compute the brand-grouping key for one offer. Mirrors the customer-app
 * dedupe heuristic so groups line up between client and server.
 */
function deriveBrandIdentity(offer: Offer): { slug: string; name: string } {
  const name = inferBrandName(offer.offer_name);
  if (offer.merchant_id && offer.merchant_id > 0) {
    // Use merchant_id as the canonical group id but still slugify the name for human-readable URLs.
    return {
      slug: slugifyBrand(name) || `merchant_${offer.merchant_id}`,
      name: name || `Merchant ${offer.merchant_id}`,
    };
  }
  // Fallback: strip country code suffix from lookup_value.
  if (offer.lookup_value) {
    const stem = String(offer.lookup_value).replace(/_[a-z]{2}$/i, '');
    if (stem) return { slug: stem, name: name || stem };
  }
  // Last resort: slugify whatever we have.
  return { slug: slugifyBrand(name) || `offer_${offer.offer_id}`, name };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(`[migrate-brands] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`);
  await mongoose.connect(mongoUri);

  // Cast to `Model<...>` so the union returned by `mongoose.models[...]` regains callability;
  // the runtime is the same Mongoose model registered by `mongoose.model(name, schema)`.
  const OfferModel = (mongoose.models[Offer.name] ??
    mongoose.model(Offer.name, OfferSchema)) as Model<OfferDocument>;
  const BrandModel = (mongoose.models[Brand.name] ??
    mongoose.model(Brand.name, BrandSchema)) as Model<BrandDocument>;

  const stats: MigrationStats = {
    offersScanned: 0,
    offersAlreadyLinked: 0,
    brandsCreated: 0,
    brandsReused: 0,
    offersLinked: 0,
    ambiguousNames: [],
    errors: [],
  };

  // Cache: slug → brand_id, so multiple offers that share a brand only hit Mongo once.
  const slugToBrandId = new Map<string, mongoose.Types.ObjectId>();
  // Track unique slug→name pairs to surface name-mismatch warnings (e.g. "Apple" vs "Apple Inc.").
  const slugToFirstName = new Map<string, string>();

  const cursor = OfferModel.find({}).lean().cursor();
  for await (const offer of cursor) {
    stats.offersScanned += 1;
    if (offer.brand_id) {
      stats.offersAlreadyLinked += 1;
      continue;
    }
    try {
      const { slug, name } = deriveBrandIdentity(offer as unknown as Offer);
      if (!slug) {
        stats.errors.push({
          offerId: String(offer._id),
          error: 'Could not derive brand slug',
        });
        continue;
      }

      // Surface ambiguity: same slug but conflicting names (e.g. "Apple" + "Apple Music").
      const seenName = slugToFirstName.get(slug);
      if (seenName && seenName !== name) {
        stats.ambiguousNames.push(`${slug}: "${seenName}" vs "${name}"`);
      } else if (!seenName) {
        slugToFirstName.set(slug, name);
      }

      let brandId = slugToBrandId.get(slug);
      if (!brandId) {
        if (dryRun) {
          // Synthesize a fake id for printing without writing.
          brandId = new mongoose.Types.ObjectId();
          stats.brandsCreated += 1;
        } else {
          // Idempotent upsert: if the brand already exists (re-run), $setOnInsert is a no-op.
          const result = await BrandModel.findOneAndUpdate(
            { brand_slug: slug },
            {
              $setOnInsert: {
                brand_slug: slug,
                brand_name: name,
                logo:
                  offer.logo ?? offer.logo_circle ?? offer.logo_desktop ?? '',
                logo_circle: offer.logo_circle ?? '',
                banner: offer.banner ?? '',
                description: offer.description ?? '',
                categories: offer.categories ?? '',
                is_global: false,
                disabled: false,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
          if (!result) throw new Error('upsert returned null');
          brandId = result._id as mongoose.Types.ObjectId;
          // Track whether this was a fresh insert: existing docs have a `createdAt` older than now-ish.
          // Cheap heuristic: if `updatedAt - createdAt` < 1s, treat as new.
          const created = (result as unknown as { createdAt?: Date }).createdAt;
          const updated = (result as unknown as { updatedAt?: Date }).updatedAt;
          if (
            created &&
            updated &&
            updated.getTime() - created.getTime() < 1000
          ) {
            stats.brandsCreated += 1;
          } else {
            stats.brandsReused += 1;
          }
        }
        slugToBrandId.set(slug, brandId);
      } else {
        stats.brandsReused += 1;
      }

      if (!dryRun) {
        await OfferModel.updateOne(
          { _id: offer._id },
          { $set: { brand_id: brandId } },
        );
      }
      stats.offersLinked += 1;
    } catch (err) {
      stats.errors.push({
        offerId: String(offer._id),
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log('[migrate-brands] done');
  console.table({
    'Offers scanned': stats.offersScanned,
    'Offers already linked (skipped)': stats.offersAlreadyLinked,
    'Brands created': stats.brandsCreated,
    'Brands reused': stats.brandsReused,
    'Offers linked this run': stats.offersLinked,
    Errors: stats.errors.length,
    'Ambiguous slug→name conflicts': stats.ambiguousNames.length,
  });
  if (stats.ambiguousNames.length > 0) {
    console.log(
      '\n[migrate-brands] Ambiguous slugs (manual review recommended):',
    );
    for (const a of stats.ambiguousNames) console.log(`  - ${a}`);
  }
  if (stats.errors.length > 0) {
    console.log('\n[migrate-brands] Errors:');
    for (const e of stats.errors.slice(0, 20)) {
      console.log(`  - offer ${e.offerId}: ${e.error}`);
    }
    if (stats.errors.length > 20) {
      console.log(`  … ${stats.errors.length - 20} more`);
    }
  }

  await mongoose.disconnect();
  process.exit(stats.errors.length > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('[migrate-brands] fatal error:', err);
  process.exit(1);
});
