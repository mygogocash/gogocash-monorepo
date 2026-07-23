import 'dotenv/config';
import mongoose, { Model } from 'mongoose';

import {
  LandingRailConfig,
  LandingRailConfigSchema,
} from '../src/offer/schemas/landing-rail-config.schema';
import { LANDING_RAIL_FIXTURE_META } from '../src/offer/landing-rail.contract';

/**
 * Canonical rail metadata mirroring the customer fixture
 * `webHomePromoSections`. Only the rail identity + presentation is seeded —
 * brand lists start empty because the fixture cards are demo brands, not real
 * catalog offers. Admins then curate real offers per rail via
 * /brands?tab=landing-rails, and the customer app falls back to the fixture
 * cards for any rail that is still empty.
 */
export const LANDING_RAIL_SEED = LANDING_RAIL_FIXTURE_META;

export type SeedLandingRailsOptions = {
  dryRun: boolean;
};

export function parseSeedLandingRailsOptions(
  argv: string[],
): SeedLandingRailsOptions {
  return { dryRun: argv.includes('--dry-run') };
}

/**
 * Idempotent + non-destructive seed. Uses `$setOnInsert` keyed by `railId`, so
 * a re-run never overwrites admin-curated titles, order, or brand lists — it
 * only inserts a rail that does not yet exist. Safe to run against beta AND
 * prod independently (they are separate Mongo instances).
 */
export async function seedLandingRails(
  mongoUri: string,
  options: SeedLandingRailsOptions,
): Promise<{ inserted: string[]; skipped: string[] }> {
  await mongoose.connect(mongoUri);

  const LandingRailModel = (mongoose.models[LandingRailConfig.name] ||
    mongoose.model(
      LandingRailConfig.name,
      LandingRailConfigSchema,
    )) as Model<LandingRailConfig>;

  const inserted: string[] = [];
  const skipped: string[] = [];

  try {
    for (const rail of LANDING_RAIL_SEED) {
      const exists = await LandingRailModel.exists({ railId: rail.railId });
      if (exists) {
        skipped.push(rail.railId);
        continue;
      }

      if (options.dryRun) {
        console.log(
          `[seed-landing-rails] dry-run — would insert rail "${rail.railId}" (${rail.title}).`,
        );
        inserted.push(rail.railId);
        continue;
      }

      await LandingRailModel.updateOne(
        { railId: rail.railId },
        {
          $setOnInsert: {
            railId: rail.railId,
            title: rail.title,
            emoji: rail.emoji,
            link: rail.link,
            cardVariant: rail.cardVariant,
            position: rail.position,
            enabled: true,
            brands: [],
            brandsDesktop: [],
            brandsMobile: [],
          },
        },
        { upsert: true },
      );
      inserted.push(rail.railId);
    }

    console.log(
      `[seed-landing-rails] inserted ${inserted.length} rail(s) [${inserted.join(
        ', ',
      )}], skipped ${skipped.length} existing [${skipped.join(', ')}].`,
    );

    return { inserted, skipped };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    console.error('MONGO_URI is required.');
    process.exit(1);
  }

  const options = parseSeedLandingRailsOptions(process.argv.slice(2));
  await seedLandingRails(mongoUri, options);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error('[seed-landing-rails] failed:', error);
    process.exit(1);
  });
}
