import { QuestRevisionFenceService } from './quest-revision-fence.service';

describe('QuestRevisionFenceService', () => {
  function query<T>(value: T) {
    const result = {
      session: jest.fn(),
      lean: jest.fn().mockResolvedValue(value),
    };
    result.session.mockReturnValue(result);
    return result;
  }

  function fenceModel(revision: unknown = 0) {
    return {
      findOne: jest.fn(() =>
        query({
          _id: 'task-v2-source-config-v1',
          fence_key: 'task-v2-source-config-v1',
          revision,
        }),
      ),
      updateOne: jest
        .fn()
        .mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    };
  }

  it('queries only task-v2 quests containing the immutable qualifying time', async () => {
    const qualifyingAt = new Date('2026-07-17T03:00:00.000Z');
    const questModel = {
      find: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn(),
    };
    const sourceFence = fenceModel();
    const service = new QuestRevisionFenceService(
      questModel as never,
      sourceFence as never,
    );
    const session = {} as never;

    await expect(
      service.freezeMatchingInSession(qualifyingAt, session),
    ).resolves.toBe(0);
    expect(questModel.find).toHaveBeenCalledWith(
      {
        reward_model: 'task_v2',
        publication_status: { $ne: 'draft' },
        start_date: { $lte: qualifyingAt },
        end_date: { $gte: qualifyingAt },
      },
      '_id config_revision task_v2_state_frozen_at',
      { session },
    );
    expect(sourceFence.updateOne).toHaveBeenCalledWith(
      {
        _id: 'task-v2-source-config-v1',
        fence_key: 'task-v2-source-config-v1',
        revision: 0,
      },
      { $inc: { revision: 1 } },
      { upsert: false, session },
    );
  });

  it('fails closed without reading quests when the exact revision CAS loses', async () => {
    const questModel = {
      find: jest.fn(),
      updateOne: jest.fn(),
    };
    const sourceFence = fenceModel();
    sourceFence.updateOne.mockResolvedValue({
      matchedCount: 0,
      modifiedCount: 0,
    });
    const service = new QuestRevisionFenceService(
      questModel as never,
      sourceFence as never,
    );

    await expect(
      service.freezeMatchingInSession(
        new Date('2026-07-17T03:00:00.000Z'),
        {} as never,
      ),
    ).rejects.toThrow('transaction fence was not acquired');
    expect(questModel.find).not.toHaveBeenCalled();
    expect(sourceFence.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'task-v2-source-config-v1',
        fence_key: 'task-v2-source-config-v1',
        revision: 0,
      }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ upsert: false }),
    );
  });

  it.each([
    null,
    {
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
    },
    {
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
      revision: -1,
    },
    {
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
      revision: 1.5,
    },
    {
      _id: 'task-v2-source-config-v1',
      fence_key: 'task-v2-source-config-v1',
      revision: Number.MAX_SAFE_INTEGER,
    },
  ])(
    'fails closed before incrementing an absent or malformed migration fence %#',
    async (fence) => {
      const questModel = { find: jest.fn(), updateOne: jest.fn() };
      const sourceFence = fenceModel();
      sourceFence.findOne.mockReturnValue(query(fence));
      const service = new QuestRevisionFenceService(
        questModel as never,
        sourceFence as never,
      );

      await expect(
        service.freezeMatchingInSession(
          new Date('2026-07-17T03:00:00.000Z'),
          {} as never,
        ),
      ).rejects.toThrow('transaction fence was not acquired');
      expect(sourceFence.updateOne).not.toHaveBeenCalled();
      expect(questModel.find).not.toHaveBeenCalled();
    },
  );

  it('does not freeze an unrelated future quest absent from the bounded query', async () => {
    const questModel = {
      find: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn(),
    };
    const service = new QuestRevisionFenceService(
      questModel as never,
      fenceModel() as never,
    );
    await service.freezeMatchingInSession(
      new Date('2026-07-17T03:00:00.000Z'),
      {} as never,
    );
    expect(questModel.updateOne).not.toHaveBeenCalled();
  });

  it('pins the observed revision before the source outbox can commit', async () => {
    const quest = {
      _id: 'quest-1',
      config_revision: 4,
      task_v2_state_frozen_at: null,
    };
    const questModel = {
      find: jest.fn().mockResolvedValue([quest]),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const service = new QuestRevisionFenceService(
      questModel as never,
      fenceModel() as never,
    );
    const session = {} as never;
    const qualifyingAt = new Date('2026-07-17T03:00:00.000Z');

    await expect(
      service.freezeMatchingInSession(qualifyingAt, session),
    ).resolves.toBe(1);
    expect(questModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'quest-1',
        publication_status: { $ne: 'draft' },
        config_revision: 4,
        start_date: { $lte: qualifyingAt },
        end_date: { $gte: qualifyingAt },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          task_v2_state_frozen_revision: 4,
          task_v2_state_frozen_reason: 'outbox',
        }),
      }),
      { session },
    );
  });
});
