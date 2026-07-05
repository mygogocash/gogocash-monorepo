import 'dotenv/config';
import mongoose, { Model } from 'mongoose';

import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import {
  TopBrandConfig,
  TopBrandConfigSchema,
} from '../src/offer/schemas/top-brand-config.schema';
import { normalizeCustomerCashbackLabel } from '../src/common/normalize-customer-cashback-label';
import { assertLocalMongoUri } from './seed-local-admin';

const ACTIVE_OFFER_FILTER = {
  disabled: { $ne: true },
  status: { $nin: ['pending_review', 'rejected'] },
};

export type SeedTopBrandsOptions = {
  dryRun: boolean;
  force: boolean;
  limit: number;
  replace: boolean;
};

export function parseSeedTopBrandsOptions(argv: string[]): SeedTopBrandsOptions {
  const options: SeedTopBrandsOptions = {
    dryRun: false,
    force: false,
    limit: 12,
    replace: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    if (arg === '--merge') {
      options.replace = false;
      continue;
    }

    if (arg === '--limit') {
      options.limit = Math.max(1, Number(argv[index + 1] ?? options.limit));
      index += 1;
    }
  }

  return options;
}

function deriveCashbackLabel(offer: {
  commission_store?: number | string | null;
}): string {
  const store = offer.commission_store;
  if (typeof store === 'number' && Number.isFinite(store) && store > 0) {
    return `${store}%`;
  }

  if (store != null && String(store).trim()) {
    const trimmed = String(store).trim();
    return trimmed.includes('%') ? trimmed : `${trimmed}%`;
  }

  return '5%';
}

export async function seedTopBrands(
  mongoUri: string,
  options: SeedTopBrandsOptions,
): Promise<{ brands: { offerId: string; cashback: string; brand: string }[] }> {
  assertLocalMongoUri(mongoUri, options.force);
  await mongoose.connect(mongoUri);

  const OfferModel = (mongoose.models[Offer.name] ||
    mongoose.model(Offer.name, OfferSchema)) as Model<Offer>;
  const TopBrandModel = (mongoose.models[TopBrandConfig.name] ||
    mongoose.model(TopBrandConfig.name, TopBrandConfigSchema)) as Model<TopBrandConfig>;

  try {
    const offers = await OfferModel.find({
      ...ACTIVE_OFFER_FILTER,
      $or: [
        { logo: { $exists: true, $nin: [null, ''] } },
        { logo_desktop: { $exists: true, $nin: [null, ''] } },
        { logo_circle: { $exists: true, $nin: [null, ''] } },
      ],
    })
      .sort({ offer_id: 1 })
      .limit(options.limit)
      .select('_id offer_id offer_name offer_name_display commission_store logo logo_desktop logo_circle')
      .lean()
      .exec();

    const brands = offers.map((offer) => {
      const row = offer as {
        _id: { toString(): string };
        offer_name: string;
        offer_name_display?: string;
        commission_store?: number | string | null;
      };

      return {
        offerId: row._id.toString(),
        brand: row.offer_name_display?.trim() || row.offer_name,
        cashback: normalizeCustomerCashbackLabel(deriveCashbackLabel(row)),
      };
    });

    if (options.dryRun) {
      console.log('[seed-top-brands] dry-run — would upsert brands:');
      for (const brand of brands) {
        console.log(`  - ${brand.brand} (${brand.offerId}) → ${brand.cashback}`);
      }
      return { brands };
    }

    if (options.replace) {
      await TopBrandModel.updateOne(
        {},
        { $set: { brands: brands.map(({ offerId, cashback }) => ({ offerId, cashback })) } },
        { upsert: true },
      );
    } else {
      const existing = await TopBrandModel.findOne().lean().exec();
      const current = Array.isArray(existing?.brands) ? existing.brands : [];
      const seen = new Set(current.map((entry) => String(entry.offerId)));
      const merged = [
        ...current,
        ...brands
          .filter((brand) => !seen.has(brand.offerId))
          .map(({ offerId, cashback }) => ({ offerId, cashback })),
      ];
      await TopBrandModel.updateOne({}, { $set: { brands: merged } }, { upsert: true });
    }

    console.log(
      `[seed-top-brands] upserted ${brands.length} homepage top-brand entries (${options.replace ? 'replace' : 'merge'}).`,
    );

    return { brands };
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

  const options = parseSeedTopBrandsOptions(process.argv.slice(2));
  await seedTopBrands(mongoUri, options);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error('[seed-top-brands] failed:', error);
    process.exit(1);
  });
}
