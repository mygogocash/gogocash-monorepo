/**
 * Guarded compatibility migration for #353.
 *
 * - Missing reward_model becomes legacy_v1.
 * - Legacy offer tasks receive deterministic task_key/task_type/points fields.
 * - Task order, enabled state, wording, notes, and offer identity are preserved.
 * - task_v2 quests are never rewritten.
 *
 * Usage:
 *   npm run backfill:quest-tasks:dry
 *   npm run backfill:quest-tasks:apply -- --confirm-legacy-quest-backfill
 *
 * Apply performs compare-and-set writes and an immediate zero-change rerun.
 */

import 'dotenv/config';
import mongoose, { Model } from 'mongoose';
import {
  Quest,
  QuestDocument,
  QuestSchema,
} from '../src/point/schemas/quest.schema';
import {
  planQuestTaskBackfill,
  QuestTaskBackfillInput,
} from '../src/point/quest-task-backfill';

async function readQuests(
  questModel: Model<QuestDocument>,
): Promise<QuestTaskBackfillInput[]> {
  return (await questModel
    .find({}, { _id: 1, reward_model: 1, tasks: 1 })
    .lean()) as unknown as QuestTaskBackfillInput[];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const confirmed = process.argv.includes('--confirm-legacy-quest-backfill');
  if (apply && !confirmed) {
    throw new Error(
      'Apply requires --confirm-legacy-quest-backfill after reviewing a captured dry run and database backup.',
    );
  }
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error('MONGO_URI is not set. Aborting.');

  await mongoose.connect(mongoUri);
  const QuestModel = (mongoose.models[Quest.name] ??
    mongoose.model(Quest.name, QuestSchema)) as Model<QuestDocument>;
  const source = await readQuests(QuestModel);
  const plan = planQuestTaskBackfill(source);
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        scanned: plan.scanned,
        already_canonical: plan.already_canonical,
        task_v2_skipped: plan.task_v2_skipped,
        would_update: plan.would_update,
        reward_models_to_add: plan.reward_models_to_add,
        task_keys_to_add: plan.task_keys_to_add,
        quest_ids: plan.updates.map((update) => update.quest_id),
      },
      null,
      2,
    ),
  );
  if (!apply) return;

  let modified = 0;
  for (const update of plan.updates) {
    const sourceQuest = source.find(
      (quest) => String(quest._id) === update.quest_id,
    );
    if (!sourceQuest) throw new Error(`Quest ${update.quest_id} disappeared`);
    const rewardModelFilter =
      update.expected_reward_model === undefined
        ? { reward_model: { $exists: false } }
        : { reward_model: update.expected_reward_model };
    const result = await QuestModel.collection.updateOne(
      {
        _id: sourceQuest._id as never,
        ...rewardModelFilter,
        tasks: update.expected_tasks,
      },
      {
        $set: {
          reward_model: update.reward_model,
          tasks: update.tasks,
        },
      },
    );
    if (result.matchedCount !== 1) {
      throw new Error(
        `Quest ${update.quest_id} changed after inventory; aborting compare-and-set migration`,
      );
    }
    modified += result.modifiedCount;
  }

  const rerun = planQuestTaskBackfill(await readQuests(QuestModel));
  console.log(
    JSON.stringify(
      {
        mode: 'apply-result',
        modified,
        rerun_would_update: rerun.would_update,
        rerun_task_keys_to_add: rerun.task_keys_to_add,
      },
      null,
      2,
    ),
  );
  if (rerun.would_update !== 0) {
    throw new Error(
      'Post-apply rerun is not idempotent; investigate before rollout.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
