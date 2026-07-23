import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { ClientSession, Model, Types } from 'mongoose';

import { isLegacyCronEnabled } from 'src/common/legacy-cron-gate';
import { readMulterUploadBuffer } from 'src/common/multer-upload-buffer';
import { MEDIA_FOLDER } from 'src/media/media-folders.config';
import {
  CommandOwnedStoredMediaAsset,
  PreparedCommandOwnedUpload,
  StoredMediaService,
} from 'src/media/stored-media.service';
import {
  canonicalMediaContentType,
  canonicalMediaOriginalName,
} from 'src/media/stored-media.util';

import { QuestMediaCleanupService } from './quest-media-cleanup.service';
import { QuestBannerKey } from './quest-media.validation';
import type { QuestEconomicCommitFence } from './quest-task.contract';
import { Quest } from './schemas/quest.schema';
import {
  QuestMediaWriteCommand,
  QuestMediaWriteCommandDocument,
} from './schemas/quest-media-write-command.schema';

const WRITE_LEASE_MS = 2 * 60_000;
const UPLOAD_TIMEOUT_MS = 30_000;
const RECOVERY_BATCH_SIZE = 100;
const CONCURRENT_REPLAY_WAIT_MS = 5_000;
const CONCURRENT_REPLAY_POLL_MS = 25;

export type QuestMediaWriteUpload = {
  role: QuestBannerKey;
  file: Express.Multer.File;
};

export type QuestMediaWriteInput = {
  requestKey: string;
  payloadHash: string;
  questId: Types.ObjectId;
  expectedRevision: number;
  expectedConfigRevision?: number;
  economicChange?: boolean;
  taskV2EconomicChange?: boolean;
  questPatch: Record<string, unknown>;
  uploads: QuestMediaWriteUpload[];
  commitFence?: QuestEconomicCommitFence;
  qaMarker?: string;
  qaCleanupNonceHash?: string;
};

type PlannedUpload = {
  role: QuestBannerKey;
  prepared: PreparedCommandOwnedUpload;
};

type CommandRow = {
  request_key: string;
  payload_hash: string;
  quest_id: Types.ObjectId;
  expected_revision: number;
  expected_config_revision?: number;
  economic_change?: boolean;
  task_v2_economic_change?: boolean;
  status: 'uploading' | 'committing' | 'compensating' | 'committed' | 'failed';
  attempt_token: string;
  attempts: number;
  planned_assets: Array<{
    role: QuestBannerKey;
    folder: 'quests';
    asset: CommandOwnedStoredMediaAsset;
    upload_state: 'planned' | 'confirmed';
  }>;
  superseded_assets?: CommandOwnedStoredMediaAsset[];
  committed_revision?: number;
  replacement_cleanup_completed_at?: Date;
  qa_marker?: string;
  qa_cleanup_nonce_hash?: string;
};

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const document = value as { toObject?: () => Record<string, unknown> };
  return document.toObject
    ? document.toObject()
    : { ...(value as Record<string, unknown>) };
}

function commandOwnedAsset(
  value: unknown,
): CommandOwnedStoredMediaAsset | undefined {
  const candidate = plain(value);
  if (
    candidate.provider !== 'r2' ||
    candidate.ownership !== 'command-owned' ||
    typeof candidate.owner_key !== 'string' ||
    typeof candidate.owner_attempt_token !== 'string' ||
    typeof candidate.url !== 'string' ||
    typeof candidate.bucket !== 'string' ||
    typeof candidate.object_key !== 'string' ||
    typeof candidate.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(candidate.sha256) ||
    typeof candidate.original_name !== 'string'
  ) {
    return undefined;
  }
  return candidate as CommandOwnedStoredMediaAsset;
}

function revisionOf(value: unknown): number {
  const revision = Number(plain(value).campaign_revision ?? 0);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

function validateInput(input: QuestMediaWriteInput) {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/.test(input.requestKey)) {
    throw new ConflictException('Invalid quest media request key');
  }
  if (!/^[a-f0-9]{64}$/.test(input.payloadHash)) {
    throw new ConflictException('Invalid quest media payload hash');
  }
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0
  ) {
    throw new ConflictException('Invalid quest campaign revision');
  }
  if (
    input.expectedConfigRevision !== undefined &&
    (!Number.isSafeInteger(input.expectedConfigRevision) ||
      input.expectedConfigRevision < 0)
  ) {
    throw new ConflictException('Invalid quest config revision');
  }
  if (input.taskV2EconomicChange && !input.economicChange) {
    throw new ConflictException(
      'A task-v2 economic commit must declare an economic change',
    );
  }
  if (input.taskV2EconomicChange && !input.commitFence) {
    throw new ConflictException(
      'A task-v2 economic commit requires the task-state fence',
    );
  }
  if (input.uploads.length === 0) {
    throw new ConflictException('A quest media write requires an upload');
  }
  const roles = new Set<QuestBannerKey>();
  for (const upload of input.uploads) {
    if (roles.has(upload.role)) {
      throw new ConflictException(
        `Duplicate quest banner field: ${upload.role}`,
      );
    }
    roles.add(upload.role);
  }
}

export function deterministicQuestId(requestKey: string): Types.ObjectId {
  return new Types.ObjectId(
    createHash('sha256').update(requestKey).digest('hex').slice(0, 24),
  );
}

export async function questMediaPayloadHash(input: {
  questId: Types.ObjectId;
  expectedRevision: number;
  expectedConfigRevision?: number;
  economicChange?: boolean;
  taskV2EconomicChange?: boolean;
  questPatch: Record<string, unknown>;
  uploads: QuestMediaWriteUpload[];
  qaMarker?: string;
  qaCleanupNonceHash?: string;
}): Promise<string> {
  // Task identity rotation and the economic-change flags are derived from the
  // quest state observed during execution. A retry after a successful commit
  // observes the new state, so those values must not change the immutable
  // request identity. The submitted schedule, revisions, media bytes, and all
  // other client-controlled campaign fields remain covered by the hash.
  const { tasks: _derivedTaskIdentityRotation, ...requestQuestPatch } =
    input.questPatch;
  const uploadIdentity = [];
  for (const upload of [...input.uploads].sort((a, b) =>
    a.role.localeCompare(b.role),
  )) {
    const buffer = await readMulterUploadBuffer(upload.file);
    uploadIdentity.push({
      role: upload.role,
      original_name: canonicalMediaOriginalName(upload.file.originalname),
      content_type: canonicalMediaContentType(upload.file.mimetype),
      sha256: createHash('sha256').update(buffer).digest('hex'),
    });
  }
  return createHash('sha256')
    .update(
      JSON.stringify({
        quest_id: String(input.questId),
        expected_revision: input.expectedRevision,
        expected_config_revision: input.expectedConfigRevision ?? 0,
        quest_patch: requestQuestPatch,
        uploads: uploadIdentity,
        qa_marker: input.qaMarker ?? null,
        qa_cleanup_nonce_hash: input.qaCleanupNonceHash ?? null,
      }),
    )
    .digest('hex');
}

@Injectable()
export class QuestMediaWriteService implements OnModuleInit {
  private readonly logger = new Logger(QuestMediaWriteService.name);
  private indexSetup?: Promise<void>;
  private indexSetupError?: unknown;

  constructor(
    @InjectModel(QuestMediaWriteCommand.name)
    private readonly commandModel: Model<QuestMediaWriteCommandDocument>,
    @InjectModel(Quest.name)
    private readonly questModel: Model<Quest>,
    private readonly media: StoredMediaService,
    private readonly cleanup: QuestMediaCleanupService,
  ) {}

  onModuleInit(): void {
    // The durable request-key fence is a correctness boundary, not an
    // optimization. Install the schema indexes even when global auto-indexing
    // is disabled in production. Start eagerly without defeating lazy Mongo
    // bootstrap; every command awaits the same readiness fence.
    this.startIndexSetup();
  }

  private startIndexSetup(): void {
    if (this.indexSetup) return;
    this.indexSetupError = undefined;
    this.indexSetup = this.commandModel.createIndexes().then(
      () => undefined,
      (error: unknown) => {
        this.indexSetupError = error;
        this.logger.error(
          `Quest media command index setup failed: ${errorMessage(error)}`,
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
        'Quest media durability is temporarily unavailable.',
      );
    }
  }

  async execute(input: QuestMediaWriteInput): Promise<Quest> {
    validateInput(input);
    await this.ensureIndexReady();
    const replay = (await this.commandModel
      .findOne({ request_key: input.requestKey })
      .read('primary')
      .lean()) as CommandRow | null;
    if (replay) {
      if (replay.payload_hash !== input.payloadHash) {
        throw new ConflictException(
          'request_key was already used for a different quest media payload',
        );
      }
      const accepted = await this.acceptedQuest(replay);
      if (accepted) {
        await this.markCommitted(replay, accepted);
        await this.ensureReplacementCleanup(replay);
        return accepted;
      }
      if (replay.status !== 'failed') {
        return this.awaitConcurrentReplay(input);
      }
      await this.cleanup.runForKey(input.requestKey);
      if (await this.cleanup.hasPending(input.requestKey)) {
        throw new ServiceUnavailableException(
          'A previous quest upload is still being cleaned up. Please retry shortly.',
        );
      }
    }

    const currentQuest = await this.questModel
      .findById(input.questId)
      .read('primary')
      .lean();
    if (currentQuest && revisionOf(currentQuest) !== input.expectedRevision) {
      throw new ConflictException(
        'This quest changed while you were editing. Reload and try again.',
      );
    }
    if (!currentQuest && input.expectedRevision !== 0) {
      throw new ConflictException('The quest campaign revision is stale');
    }
    const supersededAssets = this.supersededAssets(currentQuest, input.uploads);
    const attemptToken = randomUUID();
    const planned = await this.prepare(input, attemptToken);
    let command: CommandRow;
    try {
      command = await this.journal(
        input,
        attemptToken,
        planned,
        supersededAssets,
        replay,
      );
    } catch (error) {
      if (!replay && isDuplicateKeyError(error)) {
        return this.awaitConcurrentReplay(input);
      }
      throw error;
    }

    try {
      for (const item of planned) {
        await this.media.putCommandOwned(item.prepared, UPLOAD_TIMEOUT_MS);
        const confirmed = await this.commandModel.findOneAndUpdate(
          {
            request_key: input.requestKey,
            payload_hash: input.payloadHash,
            attempt_token: attemptToken,
            status: 'uploading',
            planned_assets: {
              $elemMatch: {
                role: item.role,
                upload_state: 'planned',
                'asset.object_key': item.prepared.asset.object_key,
              },
            },
          },
          {
            $set: {
              'planned_assets.$.upload_state': 'confirmed',
              lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
            },
          },
          { new: true },
        );
        if (!confirmed) throw new Error('Quest media command fence was lost');
      }

      const committing = await this.commandModel.findOneAndUpdate(
        {
          request_key: input.requestKey,
          payload_hash: input.payloadHash,
          attempt_token: attemptToken,
          status: 'uploading',
          'planned_assets.upload_state': { $not: { $eq: 'planned' } },
        },
        {
          $set: {
            status: 'committing',
            lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
          },
        },
        { new: true },
      );
      if (!committing) throw new Error('Quest media commit fence was lost');

      const saved = input.commitFence
        ? await input.commitFence((_state, session) =>
            this.commitQuest(input, attemptToken, planned, session),
          )
        : await this.commitQuest(input, attemptToken, planned);
      if (!saved) {
        throw new ConflictException(
          'This quest changed while you were editing. Reload and try again.',
        );
      }
      const committed = { ...command, status: 'committed' as const };
      await this.markCommitted(committed, saved);
      await this.ensureReplacementCleanup(committed);
      return saved;
    } catch (error) {
      const accepted = await this.acceptedQuest(command);
      if (accepted) {
        await this.markCommitted(command, accepted);
        await this.ensureReplacementCleanup(command);
        return accepted;
      }
      await this.compensate(command, error);
      throw error;
    }
  }

  private async prepare(
    input: QuestMediaWriteInput,
    attemptToken: string,
  ): Promise<PlannedUpload[]> {
    const planned: PlannedUpload[] = [];
    for (const upload of input.uploads) {
      planned.push({
        role: upload.role,
        prepared: await this.media.prepareCommandOwned(
          upload.file,
          MEDIA_FOLDER.QUESTS,
          input.requestKey,
          attemptToken,
        ),
      });
    }
    return planned;
  }

  private supersededAssets(
    quest: unknown,
    uploads: QuestMediaWriteUpload[],
  ): CommandOwnedStoredMediaAsset[] {
    const assets = plain(plain(quest).banner_assets);
    return uploads.flatMap(({ role }) => {
      const asset = commandOwnedAsset(assets[role]);
      return asset ? [asset] : [];
    });
  }

  private async journal(
    input: QuestMediaWriteInput,
    attemptToken: string,
    planned: PlannedUpload[],
    supersededAssets: CommandOwnedStoredMediaAsset[],
    replay: CommandRow | null,
  ): Promise<CommandRow> {
    const row: CommandRow = {
      request_key: input.requestKey,
      payload_hash: input.payloadHash,
      quest_id: input.questId,
      expected_revision: input.expectedRevision,
      expected_config_revision: input.expectedConfigRevision ?? 0,
      economic_change: input.economicChange === true,
      task_v2_economic_change: input.taskV2EconomicChange === true,
      status: 'uploading',
      attempt_token: attemptToken,
      attempts: (replay?.attempts ?? 0) + 1,
      planned_assets: planned.map(({ role, prepared }) => ({
        role,
        folder: MEDIA_FOLDER.QUESTS,
        asset: prepared.asset,
        upload_state: 'planned',
      })),
      superseded_assets: supersededAssets,
      ...(input.qaMarker ? { qa_marker: input.qaMarker } : {}),
      ...(input.qaCleanupNonceHash
        ? { qa_cleanup_nonce_hash: input.qaCleanupNonceHash }
        : {}),
    };
    const persisted = {
      ...row,
      lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
    };
    if (!replay) {
      await this.commandModel.create(persisted);
      return row;
    }
    const replaced = await this.commandModel.findOneAndUpdate(
      {
        request_key: replay.request_key,
        payload_hash: replay.payload_hash,
        attempt_token: replay.attempt_token,
        status: 'failed',
      },
      { $set: persisted },
      { new: true },
    );
    if (!replaced)
      throw new ConflictException('Quest media retry fence was lost');
    return row;
  }

  private async commitQuest(
    input: QuestMediaWriteInput,
    attemptToken: string,
    planned: PlannedUpload[],
    session?: ClientSession,
  ): Promise<Quest | null> {
    const filter: Record<string, unknown> = { _id: input.questId };
    const orClauses: unknown[][] = [];
    if (input.expectedRevision === 0) {
      orClauses.push([
        { campaign_revision: 0 },
        { campaign_revision: { $exists: false } },
      ]);
    } else {
      filter.campaign_revision = input.expectedRevision;
    }
    const expectedConfigRevision = input.expectedConfigRevision ?? 0;
    if (input.economicChange) {
      if (expectedConfigRevision === 0) {
        orClauses.push([
          { config_revision: 0 },
          { config_revision: { $exists: false } },
        ]);
      } else {
        filter.config_revision = expectedConfigRevision;
      }
    }
    if (input.taskV2EconomicChange) {
      filter.start_date = { $gt: new Date() };
      orClauses.push([
        { task_v2_state_frozen_at: { $exists: false } },
        { task_v2_state_frozen_at: null },
      ]);
    }
    if (orClauses.length === 1) filter.$or = orClauses[0];
    if (orClauses.length > 1) {
      filter.$and = orClauses.map(($or) => ({ $or }));
    }
    const mediaPatch: Record<string, unknown> = {
      media_command_key: input.requestKey,
      media_attempt_token: attemptToken,
      campaign_revision: input.expectedRevision + 1,
      ...(input.qaMarker ? { qa_marker: input.qaMarker } : {}),
    };
    for (const item of planned) {
      mediaPatch[item.role] = item.prepared.asset.url;
      mediaPatch[`banner_assets.${item.role}`] = item.prepared.asset;
    }
    try {
      return await this.questModel.findOneAndUpdate(
        filter,
        {
          $set: { ...input.questPatch, ...mediaPatch },
          ...(input.economicChange ? { $inc: { config_revision: 1 } } : {}),
        },
        {
          new: true,
          upsert: input.expectedRevision === 0,
          setDefaultsOnInsert: true,
          ...(session ? { session } : {}),
        },
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return null;
      throw error;
    }
  }

  private async acceptedQuest(command: CommandRow): Promise<Quest | null> {
    const filter: Record<string, unknown> = {
      _id: command.quest_id,
      media_command_key: command.request_key,
      media_attempt_token: command.attempt_token,
    };
    if (command.committed_revision) {
      filter.campaign_revision = command.committed_revision;
    }
    return this.questModel
      .findOne(filter)
      .read('primary')
      .lean() as Promise<Quest | null>;
  }

  private async awaitConcurrentReplay(
    input: QuestMediaWriteInput,
  ): Promise<Quest> {
    const deadline = Date.now() + CONCURRENT_REPLAY_WAIT_MS;
    while (true) {
      const command = (await this.commandModel
        .findOne({ request_key: input.requestKey })
        .read('primary')
        .lean()) as CommandRow | null;
      if (command) {
        if (command.payload_hash !== input.payloadHash) {
          throw new ConflictException(
            'request_key was already used for a different quest media payload',
          );
        }
        const accepted = await this.acceptedQuest(command);
        if (accepted) {
          await this.markCommitted(command, accepted);
          await this.ensureReplacementCleanup(command);
          return accepted;
        }
        if (command.status === 'failed') {
          throw new ServiceUnavailableException(
            'The concurrent quest media write failed. Please retry shortly.',
          );
        }
      }
      if (Date.now() >= deadline) {
        throw new ConflictException(
          'This quest media write is still in progress. Please retry shortly.',
        );
      }
      await delay(CONCURRENT_REPLAY_POLL_MS);
    }
  }

  private async markCommitted(
    command: CommandRow,
    quest: Quest,
  ): Promise<void> {
    const revision = revisionOf(quest);
    await this.commandModel.findOneAndUpdate(
      {
        request_key: command.request_key,
        payload_hash: command.payload_hash,
        attempt_token: command.attempt_token,
      },
      {
        $set: { status: 'committed', committed_revision: revision },
        $unset: { lease_expires_at: 1, last_error: 1 },
      },
      { new: true },
    );
    command.status = 'committed';
    command.committed_revision = revision;
  }

  private replacementCleanupKey(command: CommandRow) {
    return `${command.request_key}:replaced:${command.attempt_token}`;
  }

  private async ensureReplacementCleanup(command: CommandRow): Promise<void> {
    const assets = command.superseded_assets ?? [];
    if (assets.length === 0 || !command.committed_revision) return;
    const cleanupKey = this.replacementCleanupKey(command);
    try {
      await this.cleanup.journal({
        cleanupKey,
        questId: command.quest_id,
        replacementRevision: command.committed_revision,
        reason: 'replaced-after-commit',
        assets,
      });
      await this.cleanup.runForKey(cleanupKey);
      if (!(await this.cleanup.hasPending(cleanupKey))) {
        await this.commandModel.updateOne(
          {
            request_key: command.request_key,
            payload_hash: command.payload_hash,
            attempt_token: command.attempt_token,
            status: 'committed',
          },
          { $set: { replacement_cleanup_completed_at: new Date() } },
        );
      }
    } catch (error) {
      this.logger.error(
        `Could not run replacement cleanup request=${command.request_key}: ${errorMessage(error)}`,
      );
    }
  }

  private async compensate(command: CommandRow, error: unknown): Promise<void> {
    await this.commandModel.findOneAndUpdate(
      {
        request_key: command.request_key,
        payload_hash: command.payload_hash,
        attempt_token: command.attempt_token,
        status: { $in: ['uploading', 'committing', 'compensating'] },
      },
      {
        $set: {
          status: 'compensating',
          lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
          last_error: errorMessage(error),
        },
      },
      { new: true },
    );
    const assets = command.planned_assets.map((item) => item.asset);
    await this.cleanup.journal({
      cleanupKey: command.request_key,
      questId: command.quest_id,
      replacementRevision: command.expected_revision + 1,
      reason: 'precommit-failure',
      assets,
    });
    await this.commandModel.findOneAndUpdate(
      {
        request_key: command.request_key,
        payload_hash: command.payload_hash,
        attempt_token: command.attempt_token,
        status: 'compensating',
      },
      {
        $set: { status: 'failed', last_error: errorMessage(error) },
        $unset: { lease_expires_at: 1 },
      },
      { new: true },
    );
    try {
      await this.cleanup.runForKey(command.request_key);
    } catch (cleanupError) {
      this.logger.error(
        `Quest media compensation deferred request=${command.request_key}: ${errorMessage(cleanupError)}`,
      );
    }
  }

  @Cron('45 */10 * * * *')
  async recoverExpiredCommands(): Promise<void> {
    if (!isLegacyCronEnabled()) return;
    await this.ensureIndexReady();
    const commands = (await this.commandModel
      .find({
        status: { $in: ['uploading', 'committing', 'compensating'] },
        $or: [
          { lease_expires_at: { $lte: new Date() } },
          { lease_expires_at: { $exists: false } },
        ],
      })
      .sort({ _id: 1 })
      .limit(RECOVERY_BATCH_SIZE)
      .read('primary')
      .lean()) as CommandRow[];
    for (const command of commands) {
      try {
        const accepted = await this.acceptedQuest(command);
        if (accepted) {
          await this.markCommitted(command, accepted);
          await this.ensureReplacementCleanup(command);
        } else {
          await this.compensate(
            command,
            new Error('Recovered an expired quest media write'),
          );
        }
      } catch (error) {
        this.logger.error(
          `Quest media recovery failed request=${command.request_key}: ${errorMessage(error)}`,
        );
      }
    }
  }

  @Cron('15 */10 * * * *')
  async recoverCommittedReplacementCleanup(): Promise<void> {
    if (!isLegacyCronEnabled()) return;
    await this.ensureIndexReady();
    const commands = (await this.commandModel
      .find({
        status: 'committed',
        'superseded_assets.0': { $exists: true },
        replacement_cleanup_completed_at: { $exists: false },
      })
      .sort({ _id: 1 })
      .limit(RECOVERY_BATCH_SIZE)
      .read('primary')
      .lean()) as CommandRow[];
    for (const command of commands) {
      await this.ensureReplacementCleanup(command);
    }
  }
}
