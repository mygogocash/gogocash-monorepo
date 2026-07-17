import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import { Model, Types } from 'mongoose';

import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import {
  CommandOwnedStoredMediaAsset,
  StoredMediaService,
} from 'src/media/stored-media.service';

import { Quest } from './schemas/quest.schema';
import {
  QuestMediaCleanup,
  QuestMediaCleanupDocument,
} from './schemas/quest-media-cleanup.schema';
import {
  QuestMediaWriteCommand,
  QuestMediaWriteCommandDocument,
} from './schemas/quest-media-write-command.schema';

const CLEANUP_LEASE_MS = 60_000;
const DELETE_TIMEOUT_MS = 15_000;
const ABSENCE_PROOF_TIMEOUT_MS = 15_000;
const AMBIGUOUS_PUT_QUIESCENCE_MS = 60_000;
const BATCH_SIZE = 100;

export type QuestMediaCleanupReason =
  'precommit-failure' | 'replaced-after-commit' | 'qa-acceptance';

export type QuestMediaCleanupJournal = {
  cleanupKey: string;
  questId: Types.ObjectId;
  replacementRevision: number;
  reason: QuestMediaCleanupReason;
  assets: CommandOwnedStoredMediaAsset[];
};

type CleanupRow = QuestMediaCleanup & { _id: Types.ObjectId };

function cleanupPayloadHash(
  input: QuestMediaCleanupJournal,
  asset: CommandOwnedStoredMediaAsset,
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        cleanup_key: input.cleanupKey,
        quest_id: String(input.questId),
        replacement_revision: input.replacementRevision,
        reason: input.reason,
        asset,
      }),
    )
    .digest('hex');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class QuestMediaCleanupService implements OnModuleInit {
  private readonly logger = new Logger(QuestMediaCleanupService.name);
  private indexSetup?: Promise<void>;
  private indexSetupError?: unknown;

  constructor(
    @InjectModel(QuestMediaCleanup.name)
    private readonly cleanupModel: Model<QuestMediaCleanupDocument>,
    @InjectModel(QuestMediaWriteCommand.name)
    private readonly commandModel: Model<QuestMediaWriteCommandDocument>,
    @InjectModel(Quest.name)
    private readonly questModel: Model<Quest>,
    private readonly media: StoredMediaService,
  ) {}

  onModuleInit(): void {
    // Cleanup idempotency depends on the exact cleanup-key/object-key unique
    // fence, including in production where automatic index creation is off.
    // Start this eagerly but do not defeat AppModule's lazy Mongo bootstrap;
    // the first journal write awaits the same readiness fence below.
    this.startIndexSetup();
  }

  private startIndexSetup(): void {
    if (this.indexSetup) return;
    this.indexSetupError = undefined;
    this.indexSetup = this.cleanupModel.createIndexes().then(
      () => undefined,
      (error: unknown) => {
        this.indexSetupError = error;
        this.logger.error(
          `Quest media cleanup index setup failed: ${errorMessage(error)}`,
        );
      },
    );
  }

  private async ensureIndexReady(): Promise<void> {
    this.startIndexSetup();
    const attempt = this.indexSetup!;
    await attempt;
    if (this.indexSetupError) {
      if (this.indexSetup === attempt) this.indexSetup = undefined;
      throw new ServiceUnavailableException(
        'Quest media cleanup durability is temporarily unavailable.',
      );
    }
  }

  async journal(input: QuestMediaCleanupJournal): Promise<void> {
    await this.ensureIndexReady();
    for (const asset of input.assets) {
      if (
        asset.provider !== 'r2' ||
        asset.ownership !== 'command-owned' ||
        !asset.owner_key ||
        !asset.owner_attempt_token ||
        !asset.object_key
      ) {
        throw new Error('Refusing to tombstone unverified quest media');
      }
      const payloadHash = cleanupPayloadHash(input, asset);
      await this.cleanupModel.updateOne(
        {
          cleanup_key: input.cleanupKey,
          'asset.object_key': asset.object_key,
        },
        {
          $setOnInsert: {
            quest_id: input.questId,
            cleanup_key: input.cleanupKey,
            payload_hash: payloadHash,
            replacement_revision: input.replacementRevision,
            reason: input.reason,
            asset,
            status: 'pending',
            attempts: 0,
          },
        },
        { upsert: true },
      );
    }
  }

  async hasPending(cleanupKey: string): Promise<boolean> {
    return (
      (await this.cleanupModel.countDocuments({
        cleanup_key: cleanupKey,
        status: 'pending',
      })) > 0
    );
  }

  async runForKey(cleanupKey: string): Promise<void> {
    let afterId: Types.ObjectId | undefined;
    do {
      const filter: Record<string, unknown> = {
        cleanup_key: cleanupKey,
        status: 'pending',
      };
      if (afterId) filter._id = { $gt: afterId };
      const rows = (await this.cleanupModel
        .find(filter)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .read('primary')
        .lean()) as CleanupRow[];
      for (const row of rows) await this.deleteRow(row);
      if (rows.length < BATCH_SIZE) return;
      afterId = rows[rows.length - 1]?._id;
    } while (afterId);
  }

  private async deleteRow(row: CleanupRow): Promise<void> {
    const workerToken = randomUUID();
    const now = new Date();
    const claimed = (await this.cleanupModel.findOneAndUpdate(
      {
        _id: row._id,
        status: 'pending',
        $and: [
          {
            $or: [
              { lease_expires_at: { $lte: now } },
              { lease_expires_at: { $exists: false } },
            ],
          },
          {
            $or: [
              { delete_confirm_after: { $lte: now } },
              { delete_confirm_after: { $exists: false } },
            ],
          },
        ],
      },
      {
        $set: {
          worker_token: workerToken,
          lease_expires_at: new Date(now.getTime() + CLEANUP_LEASE_MS),
        },
        $inc: { attempts: 1 },
      },
      { new: true },
    )) as CleanupRow | null;
    if (!claimed) return;

    const sourceCommand = await this.commandModel
      .findOne({
        request_key: claimed.asset.owner_key,
        attempt_token: claimed.asset.owner_attempt_token,
        planned_assets: {
          $elemMatch: {
            'asset.object_key': claimed.asset.object_key,
            'asset.url': claimed.asset.url,
          },
        },
      })
      .read('primary')
      .lean();
    if (!sourceCommand) {
      await this.release(
        claimed,
        workerToken,
        'Command ownership could not be re-verified',
      );
      return;
    }

    const currentReference = await this.questModel
      .findOne({
        $or: [
          { banner_en: claimed.asset.url },
          { banner_th: claimed.asset.url },
          { sub_banner_en: claimed.asset.url },
          { sub_banner_th: claimed.asset.url },
          { 'banner_assets.banner_en.url': claimed.asset.url },
          { 'banner_assets.banner_th.url': claimed.asset.url },
          { 'banner_assets.sub_banner_en.url': claimed.asset.url },
          { 'banner_assets.sub_banner_th.url': claimed.asset.url },
        ],
      })
      .read('primary')
      .lean();
    if (currentReference) {
      await this.release(
        claimed,
        workerToken,
        'Object is still referenced by a quest',
      );
      return;
    }

    try {
      await this.media.deleteCommandOwnedStrict(
        claimed.asset as CommandOwnedStoredMediaAsset,
        MEDIA_FOLDER.QUESTS,
        DELETE_TIMEOUT_MS,
      );
      if (
        claimed.reason === 'precommit-failure' &&
        !claimed.initial_delete_completed_at
      ) {
        await this.cleanupModel.updateOne(
          { _id: claimed._id, status: 'pending', worker_token: workerToken },
          {
            $set: {
              initial_delete_completed_at: new Date(),
              delete_confirm_after: new Date(
                Date.now() + AMBIGUOUS_PUT_QUIESCENCE_MS,
              ),
            },
            $unset: {
              worker_token: 1,
              lease_expires_at: 1,
              last_error: 1,
            },
          },
        );
        return;
      }
      await this.media.verifyCommandOwnedAbsentStrict(
        claimed.asset as CommandOwnedStoredMediaAsset,
        MEDIA_FOLDER.QUESTS,
        ABSENCE_PROOF_TIMEOUT_MS,
      );
      await this.cleanupModel.updateOne(
        { _id: claimed._id, status: 'pending', worker_token: workerToken },
        {
          $set: { status: 'deleted', deleted_at: new Date() },
          $unset: { worker_token: 1, lease_expires_at: 1, last_error: 1 },
        },
      );
    } catch (error) {
      await this.release(claimed, workerToken, errorMessage(error));
    }
  }

  private async release(
    row: CleanupRow,
    workerToken: string,
    lastError: string,
  ): Promise<void> {
    await this.cleanupModel.updateOne(
      { _id: row._id, status: 'pending', worker_token: workerToken },
      {
        $set: { last_error: lastError },
        $unset: { worker_token: 1, lease_expires_at: 1 },
      },
    );
  }

  @Cron('30 */10 * * * *')
  async retryPending(): Promise<void> {
    const rows = (await this.cleanupModel
      .find({
        status: 'pending',
        $and: [
          {
            $or: [
              { lease_expires_at: { $lte: new Date() } },
              { lease_expires_at: { $exists: false } },
            ],
          },
          {
            $or: [
              { delete_confirm_after: { $lte: new Date() } },
              { delete_confirm_after: { $exists: false } },
            ],
          },
        ],
      })
      .sort({ _id: 1 })
      .limit(BATCH_SIZE)
      .read('primary')
      .lean()) as CleanupRow[];
    for (const row of rows) {
      try {
        await this.deleteRow(row);
      } catch (error) {
        this.logger.error(
          `Quest media cleanup retry failed id=${String(row._id)}: ${errorMessage(error)}`,
        );
      }
    }
  }
}
