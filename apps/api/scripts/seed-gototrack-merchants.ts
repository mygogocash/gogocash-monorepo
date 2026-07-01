import mongoose, { Model, Schema } from 'mongoose';

import { defaultGototrackMerchants } from '../src/gototrack/seeds/default-gototrack-merchants';

type GototrackMerchantSeedDocument = {
  merchant_id: string;
  brand_id: string;
  brand_slug: string;
  merchant_name: string;
  domains: string[];
  android_packages: string[];
  offer_id: number;
  network_merchant_id: number;
  affiliate_network: string;
  cashback_rate: string;
  supported_platforms: string[];
  confidence_threshold: number;
  enabled: boolean;
};

type SeedOptions = {
  dryRun: boolean;
  enableFirst: boolean;
  enableSelectors: Set<string>;
  resetEnabled: boolean;
};

type SeedOperation = {
  merchantId: string;
  merchantName: string;
  androidPackages: string[];
  enableSelected: boolean;
  willSetEnabled?: boolean;
};

function normalizeSelector(value: string): string {
  return value.trim().toLowerCase();
}

function splitSelectors(value: string): string[] {
  return value
    .split(',')
    .map(normalizeSelector)
    .filter(Boolean);
}

export function parseSeedOptions(argv: string[]): SeedOptions {
  const options: SeedOptions = {
    dryRun: false,
    enableFirst: false,
    enableSelectors: new Set(),
    resetEnabled: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--enable-first') {
      options.enableFirst = true;
      continue;
    }

    if (arg === '--reset-enabled') {
      options.resetEnabled = true;
      continue;
    }

    if (arg === '--enable') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('--enable requires a merchant id, name, or Android package');
      }
      splitSelectors(next).forEach((selector) =>
        options.enableSelectors.add(selector),
      );
      index += 1;
      continue;
    }

    if (arg.startsWith('--enable=')) {
      splitSelectors(arg.slice('--enable='.length)).forEach((selector) =>
        options.enableSelectors.add(selector),
      );
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function selectorMatchesMerchant(
  selectors: Set<string>,
  merchant: (typeof defaultGototrackMerchants)[number],
): boolean {
  if (selectors.size === 0) {
    return false;
  }

  const merchantSelectors = [
    merchant.merchant_id,
    merchant.merchant_name,
    merchant.brand_slug,
    String(merchant.offer_id),
    String(merchant.network_merchant_id),
    ...merchant.android_packages,
    ...merchant.domains,
  ].map(normalizeSelector);

  return merchantSelectors.some((selector) => selectors.has(selector));
}

export function buildSeedOperations(options: SeedOptions): SeedOperation[] {
  return defaultGototrackMerchants.map((merchant, index) => {
    const enableSelected =
      (options.enableFirst && index === 0) ||
      selectorMatchesMerchant(options.enableSelectors, merchant);
    const willSetEnabled =
      enableSelected || options.resetEnabled ? enableSelected : undefined;

    return {
      merchantId: merchant.merchant_id,
      merchantName: merchant.merchant_name,
      androidPackages: merchant.android_packages,
      enableSelected,
      willSetEnabled,
    };
  });
}

function getMerchantModel(): Model<GototrackMerchantSeedDocument> {
  const modelName = 'GototrackMerchant';
  const merchantSchema = new Schema<GototrackMerchantSeedDocument>(
    {
      merchant_id: { type: String, required: true, unique: true },
      brand_id: { type: String, required: true },
      brand_slug: { type: String, required: true },
      merchant_name: { type: String, required: true },
      domains: { type: [String], default: [] },
      android_packages: { type: [String], default: [] },
      offer_id: { type: Number, required: true },
      network_merchant_id: { type: Number, required: true },
      affiliate_network: { type: String, required: true },
      cashback_rate: { type: String, required: true },
      supported_platforms: { type: [String], default: ['android'] },
      confidence_threshold: { type: Number, default: 0.75 },
      enabled: { type: Boolean, default: false },
    },
    { collection: 'gogosense_merchants', timestamps: true },
  );

  merchantSchema.index({ enabled: 1 });
  merchantSchema.index({ android_packages: 1 });
  merchantSchema.index({ domains: 1 });

  return (mongoose.models[modelName] ||
    mongoose.model(modelName, merchantSchema)) as Model<
    GototrackMerchantSeedDocument
  >;
}

async function seedGototrackMerchants(options: SeedOptions) {
  const operations = buildSeedOperations(options);
  const selectedCount = operations.filter((operation) => operation.enableSelected)
    .length;

  if (options.dryRun) {
    console.log(
      `[seed-gototrack-merchants] dry-run defaultMerchants=${operations.length} selectedForEnable=${selectedCount} resetEnabled=${options.resetEnabled}`,
    );
    for (const operation of operations) {
      console.log(
        [
          operation.enableSelected ? 'ENABLE' : 'seed',
          operation.merchantId,
          operation.merchantName,
          operation.androidPackages.join(','),
          operation.willSetEnabled === undefined
            ? 'enabled=preserve'
            : `enabled=${operation.willSetEnabled}`,
        ].join(' | '),
      );
    }
    return;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required unless --dry-run is set');
  }

  await mongoose.connect(mongoUri);
  const MerchantModel = getMerchantModel();

  let upserted = 0;
  let matched = 0;
  let enabled = 0;

  try {
    for (const merchant of defaultGototrackMerchants) {
      const enableSelected =
        (options.enableFirst &&
          merchant.merchant_id === defaultGototrackMerchants[0].merchant_id) ||
        selectorMatchesMerchant(options.enableSelectors, merchant);
      const setEnabled =
        enableSelected || options.resetEnabled ? enableSelected : undefined;
      const result = await MerchantModel.updateOne(
        { merchant_id: merchant.merchant_id },
        {
          $set: {
            merchant_id: merchant.merchant_id,
            brand_id: merchant.brand_id,
            brand_slug: merchant.brand_slug,
            merchant_name: merchant.merchant_name,
            domains: merchant.domains,
            android_packages: merchant.android_packages,
            offer_id: merchant.offer_id,
            network_merchant_id: merchant.network_merchant_id,
            affiliate_network: merchant.affiliate_network,
            cashback_rate: merchant.cashback_rate,
            supported_platforms: merchant.supported_platforms,
            confidence_threshold: merchant.confidence_threshold,
            ...(setEnabled === undefined ? {} : { enabled: setEnabled }),
          },
          ...(setEnabled === undefined
            ? { $setOnInsert: { enabled: merchant.enabled } }
            : {}),
        },
        { upsert: true },
      );

      upserted += result.upsertedCount ?? 0;
      matched += result.matchedCount ?? 0;
      if (setEnabled) {
        enabled += 1;
      }
    }

    console.log(
      `[seed-gototrack-merchants] upserted=${upserted} matched=${matched} selectedForEnable=${enabled} resetEnabled=${options.resetEnabled}`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedGototrackMerchants(parseSeedOptions(process.argv.slice(2))).catch(
    (error) => {
      console.error('[seed-gototrack-merchants]', error.message);
      process.exit(1);
    },
  );
}
