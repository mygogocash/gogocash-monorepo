import { Db } from 'mongodb';

import {
  QUEST_TASK_V2_CANONICAL_FENCE_ID,
  QUEST_TASK_V2_REQUIRED_INDEXES,
  questTaskIndexMatches,
} from './quest-task-index.contract';

type IndexInfo = Parameters<typeof questTaskIndexMatches>[0];
type SourceConfigFenceRecord = {
  _id: string;
  fence_key?: unknown;
  revision?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
};
type CanonicalFenceState = 'missing' | 'ready' | 'malformed';

export type QuestTaskIndexMigrationReport = {
  task_v2_indexes_ready: boolean;
  missing_task_v2_indexes: string[];
  created_task_v2_indexes: string[];
  canonical_fence_ready: boolean;
};

async function indexes(db: Db, collectionName: string): Promise<IndexInfo[]> {
  try {
    return (await db.collection(collectionName).indexes()) as IndexInfo[];
  } catch (error) {
    const mongoError = error as { code?: number; codeName?: string };
    if (mongoError.code === 26 || mongoError.codeName === 'NamespaceNotFound') {
      return [];
    }
    throw error;
  }
}

async function canonicalFenceState(db: Db): Promise<CanonicalFenceState> {
  try {
    const fence = await db
      .collection<SourceConfigFenceRecord>('quest_source_config_fence')
      .findOne({
        $or: [
          { _id: QUEST_TASK_V2_CANONICAL_FENCE_ID },
          { fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID },
        ],
      });
    if (!fence) return 'missing';
    return fence._id === QUEST_TASK_V2_CANONICAL_FENCE_ID &&
      fence.fence_key === QUEST_TASK_V2_CANONICAL_FENCE_ID &&
      typeof fence.revision === 'number' &&
      Number.isSafeInteger(fence.revision) &&
      fence.revision >= 0
      ? 'ready'
      : 'malformed';
  } catch (error) {
    const mongoError = error as { code?: number; codeName?: string };
    if (mongoError.code === 26 || mongoError.codeName === 'NamespaceNotFound') {
      return 'missing';
    }
    throw error;
  }
}

export async function migrateQuestTaskIndexes(
  db: Db,
  options: { apply: boolean },
): Promise<QuestTaskIndexMigrationReport> {
  const initialFenceState = await canonicalFenceState(db);
  if (options.apply && initialFenceState === 'malformed') {
    throw new Error(
      'Task-v2 canonical fence is malformed; $setOnInsert cannot repair an existing fence. Repair it explicitly before applying index migrations.',
    );
  }

  const created: string[] = [];
  for (const required of QUEST_TASK_V2_REQUIRED_INDEXES) {
    const current = await indexes(db, required.collection);
    if (current.some((index) => questTaskIndexMatches(index, required))) {
      continue;
    }
    const conflicting = current.find((index) => index.name === required.name);
    if (conflicting && options.apply) {
      throw new Error(
        `Task-v2 index ${required.collection}.${required.name} exists with the wrong key or options; inspect and replace it explicitly before activation.`,
      );
    }
    if (!options.apply) continue;
    await db.collection(required.collection).createIndex(required.key, {
      name: required.name,
      ...(required.unique ? { unique: true } : {}),
      ...(required.partialFilterExpression
        ? { partialFilterExpression: required.partialFilterExpression }
        : {}),
    });
    created.push(`${required.collection}.${required.name}`);
  }

  if (options.apply && initialFenceState === 'missing') {
    await db
      .collection<SourceConfigFenceRecord>('quest_source_config_fence')
      .updateOne(
        {
          _id: QUEST_TASK_V2_CANONICAL_FENCE_ID,
          fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID,
        },
        {
          $setOnInsert: {
            _id: QUEST_TASK_V2_CANONICAL_FENCE_ID,
            fence_key: QUEST_TASK_V2_CANONICAL_FENCE_ID,
            revision: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
  }

  const missing: string[] = [];
  for (const required of QUEST_TASK_V2_REQUIRED_INDEXES) {
    const current = await indexes(db, required.collection);
    if (!current.some((index) => questTaskIndexMatches(index, required))) {
      missing.push(`${required.collection}.${required.name}`);
    }
  }
  const fenceReady = (await canonicalFenceState(db)) === 'ready';
  return {
    task_v2_indexes_ready: missing.length === 0 && fenceReady,
    missing_task_v2_indexes: missing,
    created_task_v2_indexes: created,
    canonical_fence_ready: fenceReady,
  };
}
