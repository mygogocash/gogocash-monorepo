import { Types } from 'mongoose';

import type { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

import { QuestMediaCleanupService } from './quest-media-cleanup.service';

function query<T>(value: T) {
  const result = {
    read: jest.fn(),
    lean: jest.fn(),
    sort: jest.fn(),
    limit: jest.fn(),
    then: (resolve: (input: T) => unknown) =>
      Promise.resolve(value).then(resolve),
  };
  result.read.mockReturnValue(result);
  result.sort.mockReturnValue(result);
  result.limit.mockReturnValue(result);
  result.lean.mockResolvedValue(value);
  return result;
}

function ownedAsset(): CommandOwnedStoredMediaAsset {
  return {
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: 'quest-media:source-command',
    owner_attempt_token: 'source-attempt',
    url: 'https://media.example/quests/source-attempt/banner.png',
    bucket: 'media',
    object_key: 'quests/source-attempt/banner.png',
    sha256: 'a'.repeat(64),
    original_name: 'banner.png',
    content_type: 'image/png',
  };
}

describe('QuestMediaCleanupService', () => {
  it('starts unique-index installation without blocking bootstrap and gates journaling on readiness', async () => {
    let releaseIndexes!: () => void;
    const cleanupModel = {
      createIndexes: jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          releaseIndexes = resolve;
        }),
      ),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const service = new QuestMediaCleanupService(
      cleanupModel as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const journal = {
      cleanupKey: 'quest-media:index-gate',
      questId: new Types.ObjectId(),
      replacementRevision: 1,
      reason: 'replaced-after-commit' as const,
      assets: [ownedAsset()],
    };

    expect(service.onModuleInit()).toBeUndefined();
    const pending = service.journal(journal);
    await Promise.resolve();
    expect(cleanupModel.updateOne).not.toHaveBeenCalled();

    releaseIndexes();
    await expect(pending).resolves.toBeUndefined();
    expect(cleanupModel.updateOne).toHaveBeenCalledTimes(1);
  });

  it('rechecks command ownership and live quest refs immediately before strict deletion', async () => {
    const row = {
      _id: new Types.ObjectId(),
      quest_id: new Types.ObjectId(),
      cleanup_key: 'quest-media:cleanup-command',
      replacement_revision: 2,
      reason: 'replaced-after-commit',
      asset: ownedAsset(),
      status: 'pending',
    };
    const cleanupModel = {
      createIndexes: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockReturnValue(query([row])),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValue({ ...row, worker_token: 'worker' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    const commandModel = {
      findOne: jest
        .fn()
        .mockReturnValue(query({ request_key: row.asset.owner_key })),
    };
    const questModel = {
      findOne: jest.fn().mockReturnValue(query(null)),
    };
    const media = {
      deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
      verifyCommandOwnedAbsentStrict: jest.fn().mockResolvedValue(undefined),
    };
    const service = new QuestMediaCleanupService(
      cleanupModel as never,
      commandModel as never,
      questModel as never,
      media as never,
    );

    await service.onModuleInit();

    await service.runForKey(row.cleanup_key);

    expect(cleanupModel.createIndexes).toHaveBeenCalledTimes(1);

    expect(commandModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: row.asset.owner_key,
        attempt_token: row.asset.owner_attempt_token,
        planned_assets: expect.objectContaining({
          $elemMatch: expect.objectContaining({
            'asset.object_key': row.asset.object_key,
          }),
        }),
      }),
    );
    expect(questModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { banner_en: row.asset.url },
          { sub_banner_th: row.asset.url },
          { 'banner_assets.banner_en.url': row.asset.url },
          { 'banner_assets.sub_banner_th.url': row.asset.url },
        ]),
      }),
    );
    expect(questModel.findOne.mock.calls[0][0]).not.toHaveProperty('_id');
    expect(media.deleteCommandOwnedStrict).toHaveBeenCalledWith(
      row.asset,
      'quests',
      expect.any(Number),
    );
  });

  it('does not delete an object that a different quest still references through a legacy banner field', async () => {
    const row = {
      _id: new Types.ObjectId(),
      quest_id: new Types.ObjectId(),
      cleanup_key: 'quest-media:cleanup-live-ref',
      replacement_revision: 2,
      reason: 'precommit-failure',
      asset: ownedAsset(),
      status: 'pending',
    };
    const cleanupModel = {
      createIndexes: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockReturnValue(query([row])),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValue({ ...row, worker_token: 'worker' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(1),
    };
    const commandModel = {
      findOne: jest
        .fn()
        .mockReturnValue(query({ request_key: row.asset.owner_key })),
    };
    const questModel = {
      findOne: jest.fn().mockReturnValue(query({ _id: new Types.ObjectId() })),
    };
    const media = { deleteCommandOwnedStrict: jest.fn() };
    const service = new QuestMediaCleanupService(
      cleanupModel as never,
      commandModel as never,
      questModel as never,
      media as never,
    );

    await service.runForKey(row.cleanup_key);

    expect(media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    expect(cleanupModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: row._id }),
      expect.objectContaining({
        $set: expect.objectContaining({
          last_error: 'Object is still referenced by a quest',
        }),
      }),
    );
    expect(questModel.findOne.mock.calls[0][0]).not.toHaveProperty('_id');
  });

  it('does not delete an object retained only by a nested banner asset after string-field drift', async () => {
    const row = {
      _id: new Types.ObjectId(),
      quest_id: new Types.ObjectId(),
      cleanup_key: 'quest-media:cleanup-nested-ref',
      replacement_revision: 4,
      reason: 'replaced-after-commit',
      asset: ownedAsset(),
      status: 'pending',
    };
    const cleanupModel = {
      find: jest.fn().mockReturnValue(query([row])),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValue({ ...row, worker_token: 'worker' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(1),
    };
    const commandModel = {
      findOne: jest
        .fn()
        .mockReturnValue(query({ request_key: row.asset.owner_key })),
    };
    const questModel = {
      findOne: jest.fn().mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          banner_en: 'https://media.example/quests/new-banner.png',
          banner_assets: { banner_en: { url: row.asset.url } },
        }),
      ),
    };
    const media = { deleteCommandOwnedStrict: jest.fn() };
    const service = new QuestMediaCleanupService(
      cleanupModel as never,
      commandModel as never,
      questModel as never,
      media as never,
    );

    await service.runForKey(row.cleanup_key);

    expect(questModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { 'banner_assets.banner_en.url': row.asset.url },
          { 'banner_assets.banner_th.url': row.asset.url },
          { 'banner_assets.sub_banner_en.url': row.asset.url },
          { 'banner_assets.sub_banner_th.url': row.asset.url },
        ]),
      }),
    );
    expect(media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('fails closed when the global quest reference read is ambiguous', async () => {
    const row = {
      _id: new Types.ObjectId(),
      quest_id: new Types.ObjectId(),
      cleanup_key: 'quest-media:cleanup-read-failure',
      replacement_revision: 2,
      reason: 'precommit-failure',
      asset: ownedAsset(),
      status: 'pending',
    };
    const cleanupModel = {
      find: jest.fn().mockReturnValue(query([row])),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValue({ ...row, worker_token: 'worker' }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    const commandModel = {
      findOne: jest
        .fn()
        .mockReturnValue(query({ request_key: row.asset.owner_key })),
    };
    const failedRead = query(null);
    failedRead.lean.mockRejectedValue(new Error('primary read unavailable'));
    const questModel = { findOne: jest.fn().mockReturnValue(failedRead) };
    const media = { deleteCommandOwnedStrict: jest.fn() };
    const service = new QuestMediaCleanupService(
      cleanupModel as never,
      commandModel as never,
      questModel as never,
      media as never,
    );

    await expect(service.runForKey(row.cleanup_key)).rejects.toThrow(
      'primary read unavailable',
    );
    expect(media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('keeps an ambiguous-Put tombstone retryable until a delayed re-delete and strict absence proof', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-17T00:00:00.000Z'));
    try {
      const row = {
        _id: new Types.ObjectId(),
        quest_id: new Types.ObjectId(),
        cleanup_key: 'quest-media:cleanup-ambiguous-put',
        replacement_revision: 1,
        reason: 'precommit-failure',
        asset: ownedAsset(),
        status: 'pending',
      };
      const cleanupModel = {
        find: jest.fn().mockReturnValue(query([row])),
        findOneAndUpdate: jest
          .fn()
          .mockResolvedValueOnce({ ...row, worker_token: 'first-worker' })
          .mockResolvedValueOnce({
            ...row,
            worker_token: 'second-worker',
            initial_delete_completed_at: new Date(),
            delete_confirm_after: new Date(Date.now() - 1),
          }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      };
      const commandModel = {
        findOne: jest
          .fn()
          .mockReturnValue(query({ request_key: row.asset.owner_key })),
      };
      const questModel = {
        findOne: jest.fn().mockReturnValue(query(null)),
      };
      const media = {
        deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
        verifyCommandOwnedAbsentStrict: jest.fn().mockResolvedValue(undefined),
      };
      const service = new QuestMediaCleanupService(
        cleanupModel as never,
        commandModel as never,
        questModel as never,
        media as never,
      );

      await service.runForKey(row.cleanup_key);

      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(1);
      expect(media.verifyCommandOwnedAbsentStrict).not.toHaveBeenCalled();
      expect(cleanupModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: row._id, status: 'pending' }),
        expect.objectContaining({
          $set: expect.objectContaining({
            initial_delete_completed_at: expect.any(Date),
            delete_confirm_after: expect.any(Date),
          }),
        }),
      );
      expect(cleanupModel.updateOne).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'deleted' }),
        }),
      );

      jest.advanceTimersByTime(5 * 60_000);
      await service.runForKey(row.cleanup_key);

      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(2);
      expect(media.verifyCommandOwnedAbsentStrict).toHaveBeenCalledWith(
        row.asset,
        'quests',
        expect.any(Number),
      );
      expect(cleanupModel.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: row._id, status: 'pending' }),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'deleted' }),
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
