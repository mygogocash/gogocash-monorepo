import 'dotenv/config';
import mongoose from 'mongoose';
import { FeeRate, FeeRateSchema } from '../src/withdraw/schemas/feeRate.schema';

/**
 * Upsert the global fee rate document required by POST /withdraw/check.
 * Safe to run on Railway staging/dev: uses the service MONGO_URI (same DB as the API).
 */
async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(mongoUri);
  const FeeRateModel =
    (mongoose.models[FeeRate.name] as mongoose.Model<FeeRate>) ??
    mongoose.model(FeeRate.name, FeeRateSchema);

  const result = await FeeRateModel.updateOne(
    {},
    {
      $set: {
        system: 5,
        store: 5,
        max_cap: 100_000,
        fee_withdraw_thb: 0,
        fee_withdraw_usd: 0,
        minimum_withdraw_thb: 1,
        minimum_withdraw_usd: 1,
      },
    },
    { upsert: true },
  );

  const doc = await FeeRateModel.findOne().lean();
  console.log(
    `[seed-staging-feerate] upserted feerates matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount} _id=${doc?._id?.toString() ?? 'unknown'} db=${mongoose.connection.db?.databaseName ?? 'unknown'}`,
  );

  await mongoose.disconnect();
}

main().catch((error: Error) => {
  console.error('[seed-staging-feerate]', error.message);
  process.exit(1);
});
