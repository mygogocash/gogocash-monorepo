import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import mongoose, { Connection, Model, Types } from 'mongoose';

import type {
  CommandOwnedStoredMediaAsset,
  PreparedCommandOwnedUpload,
} from 'src/media/stored-media.service';
import {
  localMongoDatabaseUri,
  optionalLocalMongoUri,
} from 'src/test-support/local-mongo-uri';

import { QuestMediaCleanupService } from './quest-media-cleanup.service';
import { QuestMediaQaService } from './quest-media-qa.service';
import {
  questMediaPayloadHash,
  QuestMediaWriteInput,
  QuestMediaWriteService,
} from './quest-media-write.service';
import { Quest, QuestSchema } from './schemas/quest.schema';
import {
  QuestMediaCleanup,
  QuestMediaCleanupDocument,
  QuestMediaCleanupSchema,
} from './schemas/quest-media-cleanup.schema';
import {
  QuestMediaWriteCommand,
  QuestMediaWriteCommandDocument,
  QuestMediaWriteCommandSchema,
} from './schemas/quest-media-write-command.schema';

const baseMongoUri = optionalLocalMongoUri(process.env.QA_LOCAL_MONGO_URI);
const describeLocalMongo = baseMongoUri ? describe : describe.skip;
const ROLES = [
  'banner_en',
  'banner_th',
  'sub_banner_en',
  'sub_banner_th',
] as const;

describeLocalMongo(
  'quest media durability and exact cleanup (local Mongo)',
  () => {
    const databaseName = `gogocash_quest_media_${process.pid}_${Date.now()}`;
    let connection: Connection;
    let questModel: Model<Quest>;
    let commandModel: Model<QuestMediaWriteCommand>;
    let cleanupModel: Model<QuestMediaCleanup>;
    let media: {
      prepareCommandOwned: jest.Mock;
      putCommandOwned: jest.Mock;
      deleteCommandOwnedStrict: jest.Mock;
      verifyCommandOwnedAbsentStrict: jest.Mock;
    };
    let cleanup: QuestMediaCleanupService;
    let writer: QuestMediaWriteService;
    const originalEnv = process.env;

    beforeAll(async () => {
      connection = await mongoose
        .createConnection(localMongoDatabaseUri(baseMongoUri!, databaseName))
        .asPromise();
      questModel = connection.model(
        'QuestMediaMongoQuest',
        QuestSchema,
        'quests',
      );
      commandModel = connection.model(
        'QuestMediaMongoCommand',
        QuestMediaWriteCommandSchema,
        'quest_media_write_commands',
      );
      cleanupModel = connection.model(
        'QuestMediaMongoCleanup',
        QuestMediaCleanupSchema,
        'quest_media_cleanup',
      );
    });

    beforeEach(async () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        QUEST_MEDIA_QA_ENABLED: 'true',
      };
      await connection.dropDatabase();
      await commandModel.createIndexes();
      await cleanupModel.createIndexes();
      media = {
        prepareCommandOwned: jest.fn(
          async (
            file: Express.Multer.File,
            _folder: string,
            requestKey: string,
            attemptToken: string,
          ): Promise<PreparedCommandOwnedUpload> => {
            const role = file.fieldname;
            const sha256 = createHash('sha256')
              .update(file.buffer)
              .digest('hex');
            const asset: CommandOwnedStoredMediaAsset = {
              provider: 'r2',
              ownership: 'command-owned',
              owner_key: requestKey,
              owner_attempt_token: attemptToken,
              url: `https://media.example/quests/${attemptToken}/${role}.png`,
              bucket: 'media',
              object_key: `quests/${attemptToken}/${role}.png`,
              sha256,
              original_name: `${role}.png`,
              content_type: 'image/png',
            };
            return { asset, file, access: 'public' };
          },
        ),
        putCommandOwned: jest.fn().mockResolvedValue(undefined),
        deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
        verifyCommandOwnedAbsentStrict: jest.fn().mockResolvedValue(undefined),
      };
      cleanup = new QuestMediaCleanupService(
        cleanupModel as unknown as Model<QuestMediaCleanupDocument>,
        commandModel as unknown as Model<QuestMediaWriteCommandDocument>,
        questModel,
        media as never,
      );
      writer = new QuestMediaWriteService(
        commandModel as unknown as Model<QuestMediaWriteCommandDocument>,
        questModel,
        media as never,
        cleanup,
      );
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    afterAll(async () => {
      await connection.dropDatabase();
      await connection.close();
    });

    function uploads(roles: readonly (typeof ROLES)[number][] = ROLES) {
      return roles.map((role) => ({
        role,
        file: {
          fieldname: role,
          originalname: `${role}.png`,
          mimetype: 'image/png',
          size: role.length,
          buffer: Buffer.from(`genuine-${role}`),
        } as Express.Multer.File,
      }));
    }

    async function input(
      requestKey: string,
      questId: Types.ObjectId,
      expectedRevision: number,
      selected = uploads(),
      extra: Partial<QuestMediaWriteInput> = {},
    ): Promise<QuestMediaWriteInput> {
      const questPatch = {
        start_date: new Date('2099-07-01T00:00:00.000Z'),
        end_date: new Date('2099-07-31T00:00:00.000Z'),
        status: 'scheduled',
        facebook_post: '',
        facebook_page: '',
        line: '',
      };
      return {
        requestKey,
        questId,
        expectedRevision,
        questPatch,
        uploads: selected,
        payloadHash: await questMediaPayloadHash({
          questId,
          expectedRevision,
          questPatch,
          uploads: selected,
        }),
        ...extra,
      };
    }

    function installTwoAttemptPreparationBarrier() {
      const basePrepare = media.prepareCommandOwned.getMockImplementation() as (
        file: Express.Multer.File,
        folder: string,
        requestKey: string,
        attemptToken: string,
      ) => Promise<PreparedCommandOwnedUpload>;
      const counts = new Map<string, number>();
      const readyAttempts = new Set<string>();
      let releaseBoth!: () => void;
      const bothReady = new Promise<void>((resolve) => {
        releaseBoth = resolve;
      });
      media.prepareCommandOwned.mockImplementation(
        async (file, folder, requestKey, attemptToken) => {
          const prepared = await basePrepare(
            file,
            folder,
            requestKey,
            attemptToken,
          );
          const count = (counts.get(attemptToken) ?? 0) + 1;
          counts.set(attemptToken, count);
          if (count === ROLES.length) {
            readyAttempts.add(attemptToken);
            if (readyAttempts.size === 2) releaseBoth();
            await bothReady;
          }
          return prepared;
        },
      );
    }

    it('persists one exact four-object intent, replays idempotently, and cleans a superseded object only after revision commit', async () => {
      const questId = new Types.ObjectId();
      const createInput = await input(
        'quest-media:mongo-create-command',
        questId,
        0,
      );

      const created = await writer.execute(createInput);

      expect(created.campaign_revision).toBe(1);
      expect(new Set(ROLES.map((role) => created[role])).size).toBe(4);
      expect(media.putCommandOwned).toHaveBeenCalledTimes(4);
      await expect(
        commandModel.countDocuments({
          request_key: createInput.requestKey,
          status: 'committed',
          'planned_assets.upload_state': 'confirmed',
        }),
      ).resolves.toBe(1);

      const replay = await writer.execute(createInput);
      expect(String((replay as Quest & { _id: Types.ObjectId })._id)).toBe(
        String((created as Quest & { _id: Types.ObjectId })._id),
      );
      expect(media.putCommandOwned).toHaveBeenCalledTimes(4);

      const oldBanner = created.banner_assets.banner_en;
      const replacementInput = await input(
        'quest-media:mongo-replace-command',
        questId,
        1,
        uploads(['banner_en']),
      );
      const replaced = await writer.execute(replacementInput);

      expect(replaced.campaign_revision).toBe(2);
      expect(replaced.banner_en).not.toBe(created.banner_en);
      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledWith(
        expect.objectContaining({ object_key: oldBanner.object_key }),
        'quests',
        expect.any(Number),
      );
      const cleanupRow = await cleanupModel
        .findOne({
          reason: 'replaced-after-commit',
          'asset.object_key': oldBanner.object_key,
        })
        .lean();
      expect(cleanupRow).toMatchObject({ status: 'deleted' });
    });

    it('admits one concurrent identical command and makes the loser replay the committed quest', async () => {
      const questId = new Types.ObjectId();
      const createInput = await input(
        'quest-media:mongo-concurrent-identical',
        questId,
        0,
      );
      installTwoAttemptPreparationBarrier();

      const [first, second] = await Promise.all([
        writer.execute(createInput),
        writer.execute(createInput),
      ]);

      expect(String((first as Quest & { _id: Types.ObjectId })._id)).toBe(
        String((second as Quest & { _id: Types.ObjectId })._id),
      );
      await expect(
        commandModel.countDocuments({ request_key: createInput.requestKey }),
      ).resolves.toBe(1);
      await expect(questModel.countDocuments({ _id: questId })).resolves.toBe(
        1,
      );
      expect(media.putCommandOwned).toHaveBeenCalledTimes(4);
    });

    it('returns a controlled conflict for concurrent payload drift without duplicate objects or quests', async () => {
      const questId = new Types.ObjectId();
      const acceptedInput = await input(
        'quest-media:mongo-concurrent-drift',
        questId,
        0,
      );
      const driftedInput = {
        ...acceptedInput,
        payloadHash: 'f'.repeat(64),
      };
      installTwoAttemptPreparationBarrier();

      const settled = await Promise.allSettled([
        writer.execute(acceptedInput),
        writer.execute(driftedInput),
      ]);
      const fulfilled = settled.filter((item) => item.status === 'fulfilled');
      const rejected = settled.filter((item) => item.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConflictException,
      );
      await expect(
        commandModel.countDocuments({ request_key: acceptedInput.requestKey }),
      ).resolves.toBe(1);
      await expect(questModel.countDocuments({ _id: questId })).resolves.toBe(
        1,
      );
      expect(media.putCommandOwned).toHaveBeenCalledTimes(4);
    });

    it('retains ambiguous-Put tombstones through quiescence, delayed re-delete, and strict absence proof', async () => {
      const questId = new Types.ObjectId();
      const failedInput = await input(
        'quest-media:mongo-failed-command',
        questId,
        0,
      );
      media.putCommandOwned
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('ambiguous provider timeout'));

      await expect(writer.execute(failedInput)).rejects.toThrow(
        'ambiguous provider timeout',
      );

      await expect(questModel.countDocuments({ _id: questId })).resolves.toBe(
        0,
      );
      await expect(
        commandModel.countDocuments({
          request_key: failedInput.requestKey,
          status: 'failed',
        }),
      ).resolves.toBe(1);
      await expect(
        cleanupModel.countDocuments({
          cleanup_key: failedInput.requestKey,
          status: 'pending',
        }),
      ).resolves.toBe(4);
      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(4);
      expect(media.verifyCommandOwnedAbsentStrict).not.toHaveBeenCalled();

      await cleanupModel.updateMany(
        { cleanup_key: failedInput.requestKey, status: 'pending' },
        { $set: { delete_confirm_after: new Date(Date.now() - 1) } },
      );
      await cleanup.retryPending();

      await expect(
        cleanupModel.countDocuments({
          cleanup_key: failedInput.requestKey,
          status: 'deleted',
        }),
      ).resolves.toBe(4);
      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(8);
      expect(media.verifyCommandOwnedAbsentStrict).toHaveBeenCalledTimes(4);
    });

    it('removes only the nonce-scoped QA quest, all four objects, its intent, and its tombstones', async () => {
      const questId = new Types.ObjectId();
      const nonce = 'mongo-acceptance-cleanup-nonce-1234567890';
      const marker = 'quest-media-qa:mongo-acceptance-marker';
      const createInput = await input(
        'quest-media:qa:mongo-acceptance-command',
        questId,
        0,
        uploads(),
        {
          qaMarker: marker,
          qaCleanupNonceHash: createHash('sha256').update(nonce).digest('hex'),
        },
      );
      await writer.execute(createInput);
      const qa = new QuestMediaQaService(
        commandModel as unknown as Model<QuestMediaWriteCommandDocument>,
        questModel,
        cleanupModel as unknown as Model<QuestMediaCleanupDocument>,
        cleanup,
      );

      await expect(
        qa.cleanupAcceptance({
          quest_id: String(questId),
          request_key: createInput.requestKey,
          qa_marker: marker,
          cleanup_nonce: nonce,
        }),
      ).resolves.toMatchObject({
        quest_deleted: true,
        objects_deleted: 4,
        intent_deleted: true,
        tombstones_deleted: 4,
      });

      await expect(questModel.countDocuments({ _id: questId })).resolves.toBe(
        0,
      );
      await expect(
        commandModel.countDocuments({ request_key: createInput.requestKey }),
      ).resolves.toBe(0);
      await expect(
        cleanupModel.countDocuments({ quest_id: questId }),
      ).resolves.toBe(0);
      expect(media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(4);
    });

    it('resumes nonce-scoped QA cleanup after quest deletion and a transient object-delete failure', async () => {
      const questId = new Types.ObjectId();
      const nonce = 'mongo-acceptance-retry-nonce-1234567890';
      const marker = 'quest-media-qa:mongo-retry-marker';
      const createInput = await input(
        'quest-media:qa:mongo-retry-command',
        questId,
        0,
        uploads(),
        {
          qaMarker: marker,
          qaCleanupNonceHash: createHash('sha256').update(nonce).digest('hex'),
        },
      );
      await writer.execute(createInput);
      const qa = new QuestMediaQaService(
        commandModel as unknown as Model<QuestMediaWriteCommandDocument>,
        questModel,
        cleanupModel as unknown as Model<QuestMediaCleanupDocument>,
        cleanup,
      );
      media.deleteCommandOwnedStrict.mockRejectedValueOnce(
        new Error('transient delete failure'),
      );

      await expect(
        qa.cleanupAcceptance({
          quest_id: String(questId),
          request_key: createInput.requestKey,
          qa_marker: marker,
          cleanup_nonce: nonce,
        }),
      ).rejects.toThrow('exact object cleanup is still pending');
      await expect(questModel.countDocuments({ _id: questId })).resolves.toBe(
        0,
      );
      await expect(
        commandModel.countDocuments({ request_key: createInput.requestKey }),
      ).resolves.toBe(1);
      await expect(
        cleanupModel.countDocuments({
          quest_id: questId,
          reason: 'qa-acceptance',
          status: 'pending',
        }),
      ).resolves.toBe(1);

      await expect(
        qa.cleanupAcceptance({
          quest_id: String(questId),
          request_key: createInput.requestKey,
          qa_marker: marker,
          cleanup_nonce: nonce,
        }),
      ).resolves.toMatchObject({
        quest_deleted: true,
        objects_deleted: 4,
        intent_deleted: true,
        tombstones_deleted: 4,
      });
      await expect(
        commandModel.countDocuments({ request_key: createInput.requestKey }),
      ).resolves.toBe(0);
      await expect(
        cleanupModel.countDocuments({ quest_id: questId }),
      ).resolves.toBe(0);
    });
  },
);
