import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import type {
  CommandOwnedStoredMediaAsset,
  PreparedCommandOwnedUpload,
} from 'src/media/stored-media.service';

import type { QuestBannerKey } from './quest-media.validation';
import {
  questMediaPayloadHash,
  QuestMediaWriteService,
} from './quest-media-write.service';

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

function asset(
  requestKey: string,
  attemptToken: string,
  role: QuestBannerKey,
): CommandOwnedStoredMediaAsset {
  return {
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: requestKey,
    owner_attempt_token: attemptToken,
    url: `https://media.example/quests/${attemptToken}/${role}.png`,
    bucket: 'media',
    object_key: `quests/${attemptToken}/${role}.png`,
    sha256: role.padEnd(64, 'a').slice(0, 64),
    original_name: `${role}.png`,
    content_type: 'image/png',
  };
}

function upload(role: QuestBannerKey) {
  return {
    role,
    file: { originalname: `${role}.png` } as Express.Multer.File,
  };
}

describe('QuestMediaWriteService', () => {
  let commandModel: Record<string, jest.Mock>;
  let questModel: Record<string, jest.Mock>;
  let media: Record<string, jest.Mock>;
  let cleanup: Record<string, jest.Mock>;
  let service: QuestMediaWriteService;

  beforeEach(() => {
    commandModel = {
      createIndexes: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      findOne: jest.fn().mockReturnValue(query(null)),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };
    questModel = {
      findById: jest.fn().mockReturnValue(query(null)),
      findOne: jest.fn().mockReturnValue(query(null)),
      findOneAndUpdate: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), campaign_revision: 1 }),
    };
    media = {
      prepareCommandOwned: jest.fn(),
      putCommandOwned: jest.fn().mockResolvedValue(undefined),
    };
    cleanup = {
      hasPending: jest.fn().mockResolvedValue(false),
      journal: jest.fn().mockResolvedValue(undefined),
      runForKey: jest.fn().mockResolvedValue(undefined),
    };
    service = new QuestMediaWriteService(
      commandModel as never,
      questModel as never,
      media as never,
      cleanup as never,
    );
  });

  it('keeps request idempotency hashes independent of derived schedule state', async () => {
    const questId = new Types.ObjectId();
    const uploads = [
      {
        role: 'banner_en' as const,
        file: {
          originalname: 'banner.png',
          mimetype: 'image/png',
          buffer: Buffer.from('same-upload'),
        } as Express.Multer.File,
      },
    ];
    const request = {
      questId,
      expectedRevision: 3,
      expectedConfigRevision: 5,
      questPatch: {
        start_date: new Date('2099-07-01T00:00:00.000Z'),
        end_date: new Date('2099-07-31T00:00:00.000Z'),
      },
      uploads,
    };

    const firstAttempt = await questMediaPayloadHash({
      ...request,
      economicChange: true,
      taskV2EconomicChange: true,
      questPatch: {
        ...request.questPatch,
        tasks: [{ task_key: 'task_server_derived_revision_6' }],
      },
    });
    const committedReplay = await questMediaPayloadHash({
      ...request,
      economicChange: false,
      taskV2EconomicChange: false,
    });
    const changedRequest = await questMediaPayloadHash({
      ...request,
      questPatch: {
        ...request.questPatch,
        end_date: new Date('2099-08-01T00:00:00.000Z'),
      },
    });

    expect(committedReplay).toBe(firstAttempt);
    expect(changedRequest).not.toBe(firstAttempt);
  });

  it('prepares the complete set, journals exact refs, and only then starts PutObject', async () => {
    media.prepareCommandOwned.mockImplementation(
      async (
        file: Express.Multer.File,
        folder: string,
        requestKey: string,
        attemptToken: string,
      ): Promise<PreparedCommandOwnedUpload> => {
        const role = file.originalname.replace('.png', '') as QuestBannerKey;
        return {
          asset: asset(requestKey, attemptToken, role),
          file,
          access: 'public',
        };
      },
    );
    const requestKey = 'quest-media:test-complete-set';

    await service.execute({
      requestKey,
      payloadHash: 'a'.repeat(64),
      questId: new Types.ObjectId(),
      expectedRevision: 0,
      questPatch: { status: 'scheduled' },
      uploads: [
        upload('banner_en'),
        upload('banner_th'),
        upload('sub_banner_en'),
        upload('sub_banner_th'),
      ],
    });

    expect(media.prepareCommandOwned).toHaveBeenCalledTimes(4);
    expect(commandModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: requestKey,
        planned_assets: expect.arrayContaining([
          expect.objectContaining({
            role: 'banner_en',
            upload_state: 'planned',
            asset: expect.objectContaining({
              owner_key: requestKey,
              object_key: expect.stringContaining('banner_en'),
            }),
          }),
        ]),
      }),
    );
    expect(commandModel.create.mock.invocationCallOrder[0]).toBeLessThan(
      media.putCommandOwned.mock.invocationCallOrder[0],
    );
    expect(media.putCommandOwned).toHaveBeenCalledTimes(4);
  });

  it('keeps upload work outside the economic fence and wraps only the final quest CAS', async () => {
    media.prepareCommandOwned.mockImplementation(
      async (
        file: Express.Multer.File,
        _folder: string,
        requestKey: string,
        attemptToken: string,
      ) => {
        const role = file.originalname.replace('.png', '') as QuestBannerKey;
        return {
          asset: asset(requestKey, attemptToken, role),
          file,
          access: 'public',
        };
      },
    );
    const session = { id: 'config-session' };
    const commitFence = jest.fn(async (commit) =>
      commit(
        { has_outbox: false, has_progress: false, has_award: false },
        session,
      ),
    );

    await service.execute({
      requestKey: 'quest-media:test-economic-fence',
      payloadHash: '9'.repeat(64),
      questId: new Types.ObjectId(),
      expectedRevision: 0,
      expectedConfigRevision: 2,
      economicChange: true,
      taskV2EconomicChange: true,
      questPatch: { status: 'scheduled' },
      uploads: [upload('banner_en')],
      commitFence,
    });

    expect(commitFence).toHaveBeenCalledTimes(1);
    expect(media.putCommandOwned.mock.invocationCallOrder[0]).toBeLessThan(
      commitFence.mock.invocationCallOrder[0],
    );
    expect(commitFence.mock.invocationCallOrder[0]).toBeLessThan(
      questModel.findOneAndUpdate.mock.invocationCallOrder[0],
    );
    expect(questModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        config_revision: 2,
        start_date: { $gt: expect.any(Date) },
      }),
      expect.objectContaining({
        $inc: { config_revision: 1 },
      }),
      expect.objectContaining({ session }),
    );
  });

  it('compensates uploaded assets when the economic commit fence rejects the final CAS', async () => {
    media.prepareCommandOwned.mockImplementation(
      async (
        file: Express.Multer.File,
        _folder: string,
        requestKey: string,
        attemptToken: string,
      ) => {
        const role = file.originalname.replace('.png', '') as QuestBannerKey;
        return {
          asset: asset(requestKey, attemptToken, role),
          file,
          access: 'public',
        };
      },
    );
    const commitFence = jest
      .fn()
      .mockRejectedValue(new ConflictException('quest economics frozen'));

    await expect(
      service.execute({
        requestKey: 'quest-media:test-economic-fence-rejected',
        payloadHash: '8'.repeat(64),
        questId: new Types.ObjectId(),
        expectedRevision: 0,
        expectedConfigRevision: 2,
        economicChange: true,
        taskV2EconomicChange: true,
        questPatch: { status: 'scheduled' },
        uploads: [upload('banner_en')],
        commitFence,
      }),
    ).rejects.toThrow('quest economics frozen');

    expect(media.putCommandOwned).toHaveBeenCalledTimes(1);
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(cleanup.journal).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'precommit-failure',
        assets: [
          expect.objectContaining({
            object_key: expect.stringContaining('banner_en'),
          }),
        ],
      }),
    );
  });

  it('does not journal, put, or persist when preparation of any selected file fails', async () => {
    media.prepareCommandOwned
      .mockResolvedValueOnce({
        asset: asset('quest-media:test-prepare', 'attempt', 'banner_en'),
        file: upload('banner_en').file,
        access: 'public',
      })
      .mockRejectedValueOnce(new Error('prepare failed'));

    await expect(
      service.execute({
        requestKey: 'quest-media:test-prepare',
        payloadHash: 'b'.repeat(64),
        questId: new Types.ObjectId(),
        expectedRevision: 0,
        questPatch: {},
        uploads: [upload('banner_en'), upload('banner_th')],
      }),
    ).rejects.toThrow('prepare failed');

    expect(commandModel.create).not.toHaveBeenCalled();
    expect(media.putCommandOwned).not.toHaveBeenCalled();
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('tombstones every exact planned asset before compensating an ambiguous Put failure', async () => {
    media.prepareCommandOwned.mockImplementation(
      async (
        file: Express.Multer.File,
        _folder: string,
        requestKey: string,
        attemptToken: string,
      ) => {
        const role = file.originalname.replace('.png', '') as QuestBannerKey;
        return {
          asset: asset(requestKey, attemptToken, role),
          file,
          access: 'public',
        };
      },
    );
    media.putCommandOwned.mockRejectedValueOnce(new Error('timeout'));

    await expect(
      service.execute({
        requestKey: 'quest-media:test-timeout',
        payloadHash: 'c'.repeat(64),
        questId: new Types.ObjectId(),
        expectedRevision: 0,
        questPatch: {},
        uploads: [upload('banner_en'), upload('banner_th')],
      }),
    ).rejects.toThrow('timeout');

    expect(cleanup.journal).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'precommit-failure',
        assets: expect.arrayContaining([
          expect.objectContaining({
            object_key: expect.stringContaining('banner_en'),
          }),
          expect.objectContaining({
            object_key: expect.stringContaining('banner_th'),
          }),
        ]),
      }),
    );
    expect(cleanup.journal.mock.invocationCallOrder[0]).toBeLessThan(
      cleanup.runForKey.mock.invocationCallOrder[0],
    );
    expect(questModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns the committed quest for an identical request replay and rejects payload drift', async () => {
    const questId = new Types.ObjectId();
    const committed = {
      request_key: 'quest-media:test-replay',
      payload_hash: 'd'.repeat(64),
      quest_id: questId,
      status: 'committed',
      committed_revision: 3,
    };
    commandModel.findOne.mockReturnValue(query(committed));
    const saved = { _id: questId, campaign_revision: 3 };
    questModel.findOne.mockReturnValue(query(saved));

    await expect(
      service.execute({
        requestKey: committed.request_key,
        payloadHash: committed.payload_hash,
        questId,
        expectedRevision: 2,
        questPatch: {},
        uploads: [upload('banner_en')],
      }),
    ).resolves.toBe(saved);
    expect(media.prepareCommandOwned).not.toHaveBeenCalled();

    await expect(
      service.execute({
        requestKey: committed.request_key,
        payloadHash: 'e'.repeat(64),
        questId,
        expectedRevision: 2,
        questPatch: {},
        uploads: [upload('banner_en')],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('turns a concurrent duplicate-key payload drift into a controlled conflict before PutObject', async () => {
    const requestKey = 'quest-media:test-concurrent-drift';
    const existing = {
      request_key: requestKey,
      payload_hash: '1'.repeat(64),
      quest_id: new Types.ObjectId(),
      expected_revision: 0,
      status: 'uploading',
      attempt_token: 'winning-attempt',
      attempts: 1,
      planned_assets: [],
    };
    commandModel.findOne
      .mockReturnValueOnce(query(null))
      .mockReturnValueOnce(query(existing));
    commandModel.create.mockRejectedValue(
      Object.assign(new Error('duplicate request key'), { code: 11000 }),
    );
    media.prepareCommandOwned.mockImplementation(
      async (
        file: Express.Multer.File,
        _folder: string,
        ownerKey: string,
        attemptToken: string,
      ) => {
        const role = file.originalname.replace('.png', '') as QuestBannerKey;
        return {
          asset: asset(ownerKey, attemptToken, role),
          file,
          access: 'public',
        };
      },
    );

    await expect(
      service.execute({
        requestKey,
        payloadHash: '2'.repeat(64),
        questId: existing.quest_id,
        expectedRevision: 0,
        questPatch: {},
        uploads: [upload('banner_en')],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(media.putCommandOwned).not.toHaveBeenCalled();
  });

  it('uses the quest folder for every command-owned preparation', async () => {
    media.prepareCommandOwned.mockRejectedValue(new Error('stop'));
    await expect(
      service.execute({
        requestKey: 'quest-media:test-folder',
        payloadHash: 'f'.repeat(64),
        questId: new Types.ObjectId(),
        expectedRevision: 0,
        questPatch: {},
        uploads: [upload('banner_en')],
      }),
    ).rejects.toThrow('stop');
    expect(media.prepareCommandOwned).toHaveBeenCalledWith(
      expect.anything(),
      MEDIA_FOLDER.QUESTS,
      'quest-media:test-folder',
      expect.any(String),
    );
  });

  it('starts unique-index installation without blocking bootstrap and gates commands on readiness', async () => {
    let releaseIndexes!: () => void;
    commandModel.createIndexes.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseIndexes = resolve;
      }),
    );
    const existing = {
      request_key: 'quest-media:index-gate',
      payload_hash: 'a'.repeat(64),
      status: 'committed',
    };
    commandModel.findOne.mockReturnValue(query(existing));

    expect(service.onModuleInit()).toBeUndefined();
    const execution = service.execute({
      requestKey: existing.request_key,
      payloadHash: 'b'.repeat(64),
      questId: new Types.ObjectId(),
      expectedRevision: 0,
      questPatch: {},
      uploads: [upload('banner_en')],
    });
    await Promise.resolve();
    expect(commandModel.findOne).not.toHaveBeenCalled();

    releaseIndexes();
    await expect(execution).rejects.toBeInstanceOf(ConflictException);
    expect(commandModel.createIndexes).toHaveBeenCalledTimes(1);
  });

  describe('CRON_ENABLED legacy cron gate', () => {
    const originalCronEnabled = process.env.CRON_ENABLED;

    afterEach(() => {
      if (originalCronEnabled === undefined) delete process.env.CRON_ENABLED;
      else process.env.CRON_ENABLED = originalCronEnabled;
    });

    it('recoverExpiredCommands > given CRON_ENABLED=false > then never touches indexes or commands', async () => {
      process.env.CRON_ENABLED = 'false';
      commandModel.find.mockReturnValue(query([]));

      await service.recoverExpiredCommands();

      expect(commandModel.createIndexes).not.toHaveBeenCalled();
      expect(commandModel.find).not.toHaveBeenCalled();
    });

    it('recoverCommittedReplacementCleanup > given CRON_ENABLED=false > then never touches indexes or commands', async () => {
      process.env.CRON_ENABLED = 'false';
      commandModel.find.mockReturnValue(query([]));

      await service.recoverCommittedReplacementCleanup();

      expect(commandModel.createIndexes).not.toHaveBeenCalled();
      expect(commandModel.find).not.toHaveBeenCalled();
    });
  });

  it('recovers replacement cleanup that could not be journaled after commit', async () => {
    const questId = new Types.ObjectId();
    const command = {
      request_key: 'quest-media:test-replacement-recovery',
      payload_hash: 'f'.repeat(64),
      quest_id: questId,
      expected_revision: 3,
      status: 'committed',
      attempt_token: 'replacement-attempt',
      attempts: 1,
      committed_revision: 4,
      planned_assets: [],
      superseded_assets: [
        asset('quest-media:old-command', 'old-attempt', 'banner_en'),
      ],
    };
    commandModel.find.mockReturnValue(query([command]));

    await service.recoverCommittedReplacementCleanup();

    expect(cleanup.journal).toHaveBeenCalledWith(
      expect.objectContaining({
        cleanupKey:
          'quest-media:test-replacement-recovery:replaced:replacement-attempt',
        reason: 'replaced-after-commit',
        assets: command.superseded_assets,
      }),
    );
    expect(cleanup.runForKey).toHaveBeenCalledWith(
      'quest-media:test-replacement-recovery:replaced:replacement-attempt',
    );
    expect(commandModel.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: command.request_key,
        attempt_token: command.attempt_token,
        status: 'committed',
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          replacement_cleanup_completed_at: expect.any(Date),
        }),
      }),
    );
  });
});
