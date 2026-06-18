/**
 * One-shot idempotent backfill: copy the current legacy Quest task source
 * (`offers.extra_point > 1`) into the active open quest's `tasks[]` snapshot.
 *
 * Run:
 *   npm run backfill:quest-tasks:dry   # preview, writes nothing
 *   npm run backfill:quest-tasks       # apply
 *
 * Options:
 *   --force   replace existing open-quest tasks instead of skipping
 *
 * Reads MONGO_URI from the environment. Take a mongodump before APPLY.
 */

import 'dotenv/config';
import mongoose, { Model, Types } from 'mongoose';
import { Offer, OfferSchema } from '../src/offer/schemas/offer.schema';
import {
  Quest,
  QuestDocument,
  QuestSchema,
} from '../src/point/schemas/quest.schema';

type OfferDoc = Offer & { _id: Types.ObjectId };

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is not set. Aborting.');
    process.exit(1);
  }

  console.log(
    `[backfill-quest-tasks] connecting (${dryRun ? 'DRY RUN' : 'APPLY'})…`,
  );
  await mongoose.connect(mongoUri);

  const OfferModel = (mongoose.models[Offer.name] ??
    mongoose.model(Offer.name, OfferSchema)) as Model<OfferDoc>;
  const QuestModel = (mongoose.models[Quest.name] ??
    mongoose.model(Quest.name, QuestSchema)) as Model<QuestDocument>;

  const quest = await QuestModel.findOne({ status: 'open' }).lean();
  if (!quest) {
    console.error('[backfill-quest-tasks] no open quest found');
    await mongoose.disconnect();
    process.exit(1);
  }

  const existingTasks = (quest as unknown as { tasks?: unknown[] }).tasks ?? [];
  if (existingTasks.length > 0 && !force) {
    console.log(
      `[backfill-quest-tasks] open quest ${String(quest._id)} already has ${existingTasks.length} task(s); use --force to replace`,
    );
    await mongoose.disconnect();
    return;
  }

  const offers = await OfferModel.find({
    extra_point: { $gt: 1 },
    disabled: { $ne: true },
    status: { $nin: ['pending_review', 'rejected'] },
  } as any)
    .sort({ extra_point: -1, offer_name: 1 })
    .lean();

  const tasks = offers.map((offer, index) => ({
    offer: offer._id,
    offer_id: Number(offer.offer_id),
    merchant_id: Number(offer.merchant_id),
    extra_point: Number(offer.extra_point),
    sort_order: index,
    enabled: true,
    wording: `Make an order on ${
      offer.offer_name_display || offer.offer_name || `Offer ${offer.offer_id}`
    }`,
    notes: '',
  }));

  console.table(
    tasks.map((task) => ({
      order: task.sort_order,
      offer_id: task.offer_id,
      merchant_id: task.merchant_id,
      extra_point: task.extra_point,
      wording: task.wording,
    })),
  );

  if (!dryRun) {
    await QuestModel.updateOne({ _id: quest._id }, { $set: { tasks } });
  }

  console.log(
    `[backfill-quest-tasks] ${dryRun ? 'would write' : 'wrote'} ${tasks.length} task(s) to quest ${String(quest._id)}`,
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
