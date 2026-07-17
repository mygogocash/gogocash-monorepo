import { QUEST_TASK_V2_REQUIRED_INDEXES } from './quest-task-index.contract';
import { QuestTaskTransactionService } from './quest-task-transaction.service';

describe('QuestTaskTransactionService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  function connection(
    hello: Record<string, unknown>,
    mutateIndexes?: (
      indexes: Map<string, Array<Record<string, unknown>>>,
    ) => void,
  ) {
    const indexes = new Map<string, Array<Record<string, unknown>>>();
    for (const required of QUEST_TASK_V2_REQUIRED_INDEXES) {
      const entries = indexes.get(required.collection) ?? [];
      entries.push({
        name: required.name,
        key: required.key,
        ...(required.unique ? { unique: true } : {}),
        ...(required.partialFilterExpression
          ? { partialFilterExpression: required.partialFilterExpression }
          : {}),
      });
      indexes.set(required.collection, entries);
    }
    mutateIndexes?.(indexes);
    const fenceUpdate = jest
      .fn()
      .mockResolvedValue({ matchedCount: 1, upsertedCount: 0 });
    const fenceFindOne = jest.fn().mockResolvedValue({
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
      revision: 0,
    });
    const indexRead = jest.fn().mockImplementation(async (name: string) => {
      if (!indexes.has(name)) {
        throw {
          name: 'MongoServerError',
          code: 26,
          codeName: 'NamespaceNotFound',
        };
      }
      return indexes.get(name)!;
    });
    const value = {
      db: {
        admin: () => ({ command: jest.fn().mockResolvedValue(hello) }),
        collection: (name: string) => ({
          indexes: jest.fn().mockImplementation(() => indexRead(name)),
          findOne:
            name === 'quest_source_config_fence'
              ? fenceFindOne
              : jest.fn().mockResolvedValue(null),
          updateOne:
            name === 'quest_source_config_fence' ? fenceUpdate : jest.fn(),
        }),
      },
    };
    return { value, indexes, fenceUpdate, fenceFindOne, indexRead };
  }

  it('keeps task-v2 disabled unless explicitly true', () => {
    process.env = { ...originalEnv };
    delete process.env.QUEST_TASK_V2_ENABLED;
    const service = new QuestTaskTransactionService({} as never);
    expect(service.enabled).toBe(false);
  });

  it('requires durable journaling while disabled once the rollout fence exists', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({
      setName: 'rs0',
      logicalSessionTimeoutMinutes: 30,
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).resolves.toBe(true);
  });

  it('keeps pre-migration flag-off environments on the legacy journal path', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection(
      { logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        indexes.clear();
      },
    );
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).resolves.toBe(false);
  });

  it('keeps a baseline-only flag-off database on the legacy journal path', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection(
      { logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        indexes.clear();
        indexes.set('conversions', [
          { name: '_id_', key: { _id: 1 } },
          { name: 'conversion_id_1', key: { conversion_id: 1 } },
        ]);
        indexes.set('points', [
          { name: '_id_', key: { _id: 1 } },
          {
            name: 'uniq_point_idempotency_key',
            key: { idempotency_key: 1 },
            unique: true,
            partialFilterExpression: {
              idempotency_key: { $type: 'string', $gt: '' },
            },
          },
        ]);
      },
    );
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).resolves.toBe(false);
  });

  it('fails closed when the reconciliation-owned point index has the wrong options', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection(
      { logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        indexes.clear();
        indexes.set('conversions', [
          { name: '_id_', key: { _id: 1 } },
          { name: 'conversion_id_1', key: { conversion_id: 1 } },
        ]);
        indexes.set('points', [
          { name: '_id_', key: { _id: 1 } },
          {
            name: 'uniq_point_idempotency_key',
            key: { idempotency_key: 1 },
            unique: false,
            partialFilterExpression: {
              idempotency_key: { $type: 'string', $gt: '' },
            },
          },
        ]);
      },
    );
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is missing',
        ),
      }),
    );
  });

  it('fails closed for a wrong-option task-v2 index artifact without a fence', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection(
      { logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        indexes.clear();
        indexes.set('quest_outbox', [
          { name: '_id_', key: { _id: 1 } },
          {
            name: 'uniq_quest_outbox_source_event',
            key: { source_type: 1, source_event_id: 1 },
            unique: false,
          },
        ]);
      },
    );
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is missing',
        ),
      }),
    );
  });

  it('fails closed for a partially prepared task-v2 collection without a fence', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection(
      { logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        indexes.clear();
        indexes.set('quest_task_progress', [{ name: '_id_', key: { _id: 1 } }]);
      },
    );
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is missing',
        ),
      }),
    );
  });

  it('fails closed when the canonical fence was deleted after task-v2 preparation', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({
      setName: 'rs0',
      logicalSessionTimeoutMinutes: 30,
    });
    fixture.fenceFindOne.mockResolvedValue(null);
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is missing',
        ),
      }),
    );
  });

  it('fails closed when the canonical fence has the wrong key', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({ logicalSessionTimeoutMinutes: 30 });
    fixture.fenceFindOne.mockResolvedValue({
      _id: 'task-v2-source-config-v1',
      fence_key: 'wrong-fence-key',
      revision: 0,
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is malformed',
        ),
      }),
    );
  });

  it('fails closed when disabled-period journal readiness cannot be read', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({ logicalSessionTimeoutMinutes: 30 });
    fixture.fenceFindOne.mockRejectedValue(new Error('mongo unavailable'));
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining('could not be verified'),
      }),
    );
  });

  it('keeps an untouched flag-off database on the legacy path when Mongo reports NamespaceNotFound indexes', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({ logicalSessionTimeoutMinutes: 30 });
    fixture.fenceFindOne.mockResolvedValue(null);
    fixture.indexRead.mockRejectedValue({
      name: 'MongoServerError',
      code: 26,
      codeName: 'NamespaceNotFound',
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).resolves.toBe(false);
  });

  it('fails closed when the canonical fence is missing its revision', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'false' };
    const fixture = connection({ logicalSessionTimeoutMinutes: 30 });
    fixture.fenceFindOne.mockResolvedValue({
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is malformed',
        ),
      }),
    );
  });

  it('validates the existing canonical fence before enabled mode requires durable journaling', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const fixture = connection({
      setName: 'rs0',
      logicalSessionTimeoutMinutes: 30,
    });
    fixture.fenceFindOne.mockResolvedValue({
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
      revision: -1,
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.durableJournalRequired()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is malformed',
        ),
      }),
    );
    expect(fixture.fenceUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [{ setName: 'rs0', logicalSessionTimeoutMinutes: 30 }, 'replica-set'],
    [{ msg: 'isdbgrid', logicalSessionTimeoutMinutes: 30 }, 'mongos'],
  ])('accepts transaction-capable topology %j', async (hello, topology) => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const service = new QuestTaskTransactionService(
      connection(hello).value as never,
    );

    await expect(service.assertReady()).resolves.toMatchObject({
      supported: true,
      topology,
      logical_sessions: true,
    });
  });

  it.each([
    [{ logicalSessionTimeoutMinutes: 30 }, 'standalone'],
    [{ setName: 'rs0' }, 'logical sessions'],
  ])(
    'rejects unsupported topology %j before source mutation',
    async (hello, reason) => {
      process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
      const service = new QuestTaskTransactionService({
        db: {
          admin: () => ({ command: jest.fn().mockResolvedValue(hello) }),
        },
      } as never);

      await expect(service.assertReady()).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining(reason),
        }),
      );
    },
  );

  it('blocks task-v2 before mutation until provider identity indexes are migrated', async () => {
    const fixture = connection(
      { setName: 'rs0', logicalSessionTimeoutMinutes: 30 },
      (indexes) =>
        indexes.set(
          'conversions',
          indexes
            .get('conversions')!
            .filter(
              (index) => index.name !== 'uniq_conversion_provider_identity',
            ),
        ),
    );
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.assertReady()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'conversions.uniq_conversion_provider_identity',
        ),
      }),
    );
    expect(fixture.fenceUpdate).not.toHaveBeenCalled();
  });

  it('blocks before canonical fence validation when an exact-once index has wrong options', async () => {
    const fixture = connection(
      { setName: 'rs0', logicalSessionTimeoutMinutes: 30 },
      (indexes) => {
        const point = indexes
          .get('points')!
          .find((index) => index.name === 'uniq_point_idempotency_key')!;
        point.partialFilterExpression = {
          idempotency_key: { $type: 'string' },
        };
      },
    );
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.assertReady()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining('points.uniq_point_idempotency_key'),
      }),
    );
    expect(fixture.fenceUpdate).not.toHaveBeenCalled();
  });

  it('re-verifies indexes on every source preflight and fails closed after drift', async () => {
    const fixture = connection({
      setName: 'rs0',
      logicalSessionTimeoutMinutes: 30,
    });
    const service = new QuestTaskTransactionService(fixture.value as never);
    await expect(service.assertReady()).resolves.toMatchObject({
      supported: true,
    });
    fixture.indexes.set(
      'quest_outbox',
      fixture.indexes
        .get('quest_outbox')!
        .filter((index) => index.name !== 'uniq_quest_outbox_source_event'),
    );

    await expect(service.assertReady()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'quest_outbox.uniq_quest_outbox_source_event',
        ),
      }),
    );
    expect(fixture.fenceUpdate).not.toHaveBeenCalled();
  });

  it('fails closed when enabled readiness finds the canonical fence deleted after preparation', async () => {
    process.env = { ...originalEnv, QUEST_TASK_V2_ENABLED: 'true' };
    const fixture = connection({
      setName: 'rs0',
      logicalSessionTimeoutMinutes: 30,
    });
    const service = new QuestTaskTransactionService(fixture.value as never);

    await expect(service.assertReady()).resolves.toMatchObject({
      supported: true,
    });
    fixture.fenceFindOne.mockResolvedValue(null);

    await expect(service.assertReady()).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          'canonical source/config fence is missing',
        ),
      }),
    );
    expect(fixture.fenceUpdate).not.toHaveBeenCalled();
  });
});
