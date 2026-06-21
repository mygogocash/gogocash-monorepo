/**
 * One-shot idempotent backfill (P1-COLLSCAN): populate the indexed
 * `conversions.user_id` ObjectId from the legacy `aff_sub1` string
 * ("user_id:<hex24>"), so the hot balance read (`checkWithdraw`) can eventually
 * query an index instead of a $regex collection scan on every request.
 *
 * IMPORTANT — the READ-SWITCH is a SEPARATE follow-up, not done here.
 * Only after BOTH of these are true should the `aff_sub1: { $regex }` reads be
 * replaced with `{ user_id }`:
 *   1. this backfill has run on the target DB, AND
 *   2. the EXTERNAL Involve-Asia conversion sync has been updated to set
 *      `user_id` on newly-ingested rows.
 * Otherwise newly-synced conversions would lack `user_id` and balances would
 * silently under-count. In-repo writers (reward conversions) already set it.
 *
 * Run:
 *   npm run backfill:conversion-userid:dry   # preview, writes nothing
 *   npm run backfill:conversion-userid       # apply
 * Reads MONGO_URI from the environment. Take a mongodump before APPLY.
 */

import 'dotenv/config';
import mongoose, { Model, Types } from 'mongoose';
import {
  Conversion,
  ConversionSchema,
} from '../src/withdraw/schemas/conversion.schema';
import { parseUserIdFromAffSub1 } from '../src/withdraw/conversion-user-id.util';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(
    `[backfill-conversion-userid] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`,
  );
  await mongoose.connect(mongoUri);

  const ConversionModel = (mongoose.models[Conversion.name] ??
    mongoose.model(Conversion.name, ConversionSchema)) as Model<Conversion>;

  let scanned = 0;
  let updated = 0;
  let unparseable = 0;
  let errors = 0;

  // Only rows that don't already have user_id (null matches missing too).
  const cursor = ConversionModel.find({ user_id: null }).lean().cursor();
  for await (const doc of cursor) {
    scanned += 1;
    const id = String((doc as { _id: unknown })._id);
    const parsed = parseUserIdFromAffSub1(
      (doc as { aff_sub1?: string }).aff_sub1,
    );
    if (!parsed) {
      unparseable += 1;
      continue;
    }
    if (dryRun) {
      updated += 1;
      continue;
    }
    try {
      await ConversionModel.updateOne(
        { _id: id },
        { $set: { user_id: new Types.ObjectId(parsed) } },
      );
      updated += 1;
    } catch (err) {
      errors += 1;
      console.error(`[backfill-conversion-userid] failed _id=${id}:`, err);
    }
  }

  console.log(
    `[backfill-conversion-userid] done — scanned=${scanned} ${
      dryRun ? 'would-update' : 'updated'
    }=${updated} unparseable(no user_id in aff_sub1)=${unparseable} errors=${errors}`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
