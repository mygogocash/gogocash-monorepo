import {
  canonicalizeStoredQuestTask,
  effectiveQuestRewardModel,
} from './quest-task.contract';

export type QuestTaskBackfillInput = {
  _id: unknown;
  reward_model?: unknown;
  tasks?: Array<Record<string, unknown>>;
};

export type QuestTaskBackfillUpdate = {
  quest_id: string;
  expected_reward_model: unknown;
  expected_tasks: Array<Record<string, unknown>>;
  reward_model: 'legacy_v1';
  tasks: Array<Record<string, unknown>>;
  added_reward_model: boolean;
  added_task_keys: number;
};

export type QuestTaskBackfillPlan = {
  scanned: number;
  already_canonical: number;
  task_v2_skipped: number;
  would_update: number;
  reward_models_to_add: number;
  task_keys_to_add: number;
  updates: QuestTaskBackfillUpdate[];
};

/**
 * Plans only the compatibility migration. It never activates task-v2, changes
 * task order/enabled state, or invents non-brand task semantics.
 */
export function planQuestTaskBackfill(
  quests: QuestTaskBackfillInput[],
): QuestTaskBackfillPlan {
  const updates: QuestTaskBackfillUpdate[] = [];
  let alreadyCanonical = 0;
  let taskV2Skipped = 0;

  for (const quest of quests) {
    const questId = String(quest._id ?? '');
    if (!questId) throw new Error('Quest task backfill requires a quest _id');
    const rewardModel = effectiveQuestRewardModel(quest.reward_model);
    if (rewardModel === 'task_v2') {
      taskV2Skipped += 1;
      continue;
    }

    const originalTasks = quest.tasks ?? [];
    if (
      originalTasks.some(
        (task) =>
          task.task_type !== undefined && task.task_type !== 'brand_purchase',
      )
    ) {
      throw new Error(
        `Legacy quest ${questId} contains a typed non-brand task and requires manual review`,
      );
    }
    const tasks = originalTasks.map((task) =>
      canonicalizeStoredQuestTask(questId, task, rewardModel),
    );
    const keys = tasks.map((task) => task.task_key);
    if (new Set(keys).size !== keys.length) {
      throw new Error(
        `Quest ${questId} has duplicate legacy brand tasks and cannot receive unique stable task keys automatically`,
      );
    }
    for (const task of tasks) {
      if (
        !Number.isInteger(task.points) ||
        task.points < 2 ||
        task.points > 10_000
      ) {
        throw new Error(
          `Quest ${questId} task ${task.task_key} has invalid points and requires manual repair`,
        );
      }
    }

    const addedRewardModel =
      quest.reward_model == null || quest.reward_model === '';
    const addedTaskKeys = originalTasks.filter(
      (task) => typeof task.task_key !== 'string' || !task.task_key.trim(),
    ).length;
    const changed =
      addedRewardModel ||
      JSON.stringify(tasks) !== JSON.stringify(originalTasks);
    if (!changed) {
      alreadyCanonical += 1;
      continue;
    }
    updates.push({
      quest_id: questId,
      expected_reward_model: quest.reward_model,
      expected_tasks: originalTasks,
      reward_model: 'legacy_v1',
      tasks,
      added_reward_model: addedRewardModel,
      added_task_keys: addedTaskKeys,
    });
  }

  return {
    scanned: quests.length,
    already_canonical: alreadyCanonical,
    task_v2_skipped: taskV2Skipped,
    would_update: updates.length,
    reward_models_to_add: updates.filter((update) => update.added_reward_model)
      .length,
    task_keys_to_add: updates.reduce(
      (sum, update) => sum + update.added_task_keys,
      0,
    ),
    updates,
  };
}
