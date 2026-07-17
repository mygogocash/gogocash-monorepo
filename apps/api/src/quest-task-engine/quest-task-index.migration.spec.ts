import { QUEST_TASK_V2_REQUIRED_INDEXES } from './quest-task-index.contract';
import { migrateQuestTaskIndexes } from './quest-task-index.migration';

function database() {
  const indexes = new Map<string, Array<Record<string, unknown>>>();
  let fence: Record<string, unknown> | null = null;
  const createIndex = jest.fn(
    async (
      collection: string,
      key: Record<string, number>,
      options: Record<string, unknown>,
    ) => {
      const entries = indexes.get(collection) ?? [];
      entries.push({ key, ...options });
      indexes.set(collection, entries);
      return String(options.name);
    },
  );
  const fenceUpdate = jest.fn().mockImplementation(async (_filter, update) => {
    if (!fence) {
      fence = update.$setOnInsert;
      return { matchedCount: 0, upsertedCount: 1 };
    }
    return { matchedCount: 1, upsertedCount: 0 };
  });
  const value = {
    collection: (name: string) => ({
      indexes: jest
        .fn()
        .mockImplementation(async () => indexes.get(name) ?? []),
      createIndex: jest
        .fn()
        .mockImplementation((key, options) => createIndex(name, key, options)),
      updateOne: fenceUpdate,
      findOne: jest.fn().mockImplementation(async () => fence),
    }),
  };
  return {
    value,
    indexes,
    createIndex,
    fenceUpdate,
    setFence(value: Record<string, unknown> | null) {
      fence = value;
    },
  };
}

describe('quest task-v2 index migration', () => {
  it('creates every exact identity index and seeds the canonical fence', async () => {
    const fixture = database();

    await expect(
      migrateQuestTaskIndexes(fixture.value as never, { apply: true }),
    ).resolves.toMatchObject({
      task_v2_indexes_ready: true,
      canonical_fence_ready: true,
      missing_task_v2_indexes: [],
      created_task_v2_indexes: QUEST_TASK_V2_REQUIRED_INDEXES.map(
        (index) => `${index.collection}.${index.name}`,
      ),
    });
    expect(fixture.createIndex).toHaveBeenCalledTimes(
      QUEST_TASK_V2_REQUIRED_INDEXES.length,
    );
  });

  it('dry-runs without writes and reports every missing identity index', async () => {
    const fixture = database();

    const report = await migrateQuestTaskIndexes(fixture.value as never, {
      apply: false,
    });

    expect(report.task_v2_indexes_ready).toBe(false);
    expect(report.missing_task_v2_indexes).toHaveLength(
      QUEST_TASK_V2_REQUIRED_INDEXES.length,
    );
    expect(fixture.createIndex).not.toHaveBeenCalled();
  });

  it('fails closed instead of replacing a same-name index with wrong options', async () => {
    const fixture = database();
    fixture.indexes.set('points', [
      {
        name: 'uniq_point_idempotency_key',
        key: { idempotency_key: 1 },
        unique: true,
        partialFilterExpression: { idempotency_key: { $type: 'string' } },
      },
    ]);

    await expect(
      migrateQuestTaskIndexes(fixture.value as never, { apply: true }),
    ).rejects.toThrow('exists with the wrong key or options');
  });

  it.each([-1, 1.5])(
    'rejects malformed canonical fence revision %p before applying index writes',
    async (revision) => {
      const fixture = database();
      fixture.setFence({
        _id: 'task-v2-source-config-v1',
        fence_key: 'task-v2-source-config-v1',
        revision,
      });

      await expect(
        migrateQuestTaskIndexes(fixture.value as never, { apply: true }),
      ).rejects.toThrow('canonical fence is malformed');
      expect(fixture.createIndex).not.toHaveBeenCalled();
      expect(fixture.fenceUpdate).not.toHaveBeenCalled();
    },
  );
});
