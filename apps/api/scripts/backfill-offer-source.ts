/**
 * One-shot idempotent backfill: stamp `offers.source = 'involve'` on every
 * legacy offer document that predates the `source` field, so the source-scoped
 * balance joins (withdraw.listCheckWithdrawNew / involve.getConversationAllPage)
 * match legacy Involve offers exactly as the old naive join did.
 *
 * IMPORTANT — run this BEFORE (or together with) the multi-network deploy.
 * The withdraw balance join now pins offer.source to the conversion's source
 * ('involve' for legacy rows). An offer document still MISSING `source` would
 * not match that pin and its `max_cap` would silently fall back to the global
 * fee cap. Stamping source:'involve' here makes the join byte-identical for all
 * live (Involve-only) data. The involve catalog sync also stamps source on its
 * next run, so this is belt-and-suspenders for offers not touched by a sync.
 *
 * Run:
 *   npm run backfill:offer-source:dry   # preview, writes nothing
 *   npm run backfill:offer-source       # apply
 * Reads MONGO_URI from the environment. Take a mongodump before APPLY.
 */

import 'dotenv/config';
import mongoose, { Model } from 'mongoose';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(
    `[backfill-offer-source] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`,
  );
  await mongoose.connect(mongoUri);

  const OfferModel = (mongoose.models[Offer.name] ??
    mongoose.model(Offer.name, OfferSchema)) as Model<Offer>;

  // Only rows that don't already carry `source` (predate the schema field).
  const filter = { source: { $exists: false } };
  const toUpdate = await OfferModel.countDocuments(filter);

  if (dryRun) {
    console.log(
      `[backfill-offer-source] done — would-update=${toUpdate} (dry run, nothing written)`,
    );
    await mongoose.disconnect();
    return;
  }

  const result = await OfferModel.updateMany(filter, {
    $set: { source: 'involve' },
  });

  console.log(
    `[backfill-offer-source] done — matched=${toUpdate} updated=${
      result.modifiedCount ?? 0
    }`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
