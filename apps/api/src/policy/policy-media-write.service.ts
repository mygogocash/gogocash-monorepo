import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import { MediaFolder } from 'src/media/media-folders.config';
import {
  CommandOwnedStoredMediaAsset,
  PreparedCommandOwnedUpload,
  StoredMediaService,
} from 'src/media/stored-media.service';

import { PolicyMediaAssetRegistryService } from './policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from './policy-media-cleanup.service';
import { PolicyIntegrityFenceService } from './policy-integrity-fence.service';
import {
  PolicyMediaWriteCommand,
  PolicyMediaWriteCommandDocument,
} from './schemas/policy-media-write-command.schema';

const WRITE_LEASE_MS = 2 * 60_000;
const COMPENSATION_LEASE_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 30_000;

export type PolicyMediaWriteUpload = {
  role: string;
  file: Express.Multer.File;
  folder: MediaFolder;
};

export type PolicyMediaWriteAssets = Record<
  string,
  CommandOwnedStoredMediaAsset
>;

export type PolicyMediaWriteInput<T> = {
  requestKey: string;
  payloadHash: string;
  ownerType: 'category' | 'offer';
  ownerId: Types.ObjectId;
  operation: 'offer-create' | 'offer-update' | 'category-update';
  uploads: PolicyMediaWriteUpload[];
  commit: (
    assets: PolicyMediaWriteAssets,
    session: ClientSession,
  ) => Promise<T>;
  /** Must perform an authoritative primary read of the owner. */
  readCommittedOwner: () => Promise<T | null>;
};

type Planned = {
  role: string;
  folder: MediaFolder;
  prepared: PreparedCommandOwnedUpload;
};

type CommandRow = {
  request_key: string;
  payload_hash: string;
  owner_type: 'category' | 'offer';
  owner_id: Types.ObjectId;
  status: 'uploading' | 'committing' | 'compensating' | 'committed' | 'failed';
  attempt_token: string;
  compensation_token?: string;
  lease_expires_at?: Date;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function expiredLeaseFilter(now: Date) {
  return {
    $or: [
      { lease_expires_at: { $lte: now } },
      { lease_expires_at: { $exists: false } },
    ],
  };
}

function validateIdentity(input: PolicyMediaWriteInput<unknown>) {
  if (!/^[A-Za-z0-9][A-Za-z0-9:._/-]{7,255}$/.test(input.requestKey)) {
    throw new ConflictException('Invalid media write request key');
  }
  if (!/^[a-f0-9]{64}$/.test(input.payloadHash)) {
    throw new ConflictException('Invalid media write payload hash');
  }
  const roles = new Set<string>();
  for (const upload of input.uploads) {
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(upload.role)) {
      throw new ConflictException('Invalid media write asset role');
    }
    if (roles.has(upload.role)) {
      throw new ConflictException('Duplicate media write asset role');
    }
    roles.add(upload.role);
  }
}

/** Stable hash helper for callers that need an idempotent media command. */
export function policyMediaWritePayloadHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/**
 * Durable pre-Put orchestrator shared by Offer/Admin category media writers.
 * It never infers an upload outcome from the thrown error: after a transaction
 * exception it rereads the command and owner from primary before compensation.
 */
@Injectable()
export class PolicyMediaWriteService {
  private readonly logger = new Logger(PolicyMediaWriteService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(PolicyMediaWriteCommand.name)
    private readonly commandModel: Model<PolicyMediaWriteCommandDocument>,
    private readonly media: StoredMediaService,
    private readonly registry: PolicyMediaAssetRegistryService,
    private readonly cleanup: PolicyMediaCleanupService,
    private readonly integrityFence: PolicyIntegrityFenceService,
  ) {}

  async execute<T>(input: PolicyMediaWriteInput<T>): Promise<T> {
    validateIdentity(input);
    await this.integrityFence.assertReady();
    if (input.uploads.length === 0 && input.operation !== 'offer-create') {
      throw new ConflictException(
        'A durable media write requires at least one upload',
      );
    }

    const replay = await this.commandModel
      .findOne({ request_key: input.requestKey })
      .read('primary')
      .lean();
    if (replay) {
      if (replay.payload_hash !== input.payloadHash) {
        throw new ConflictException(
          'request_key was already used for another media payload',
        );
      }
      if (replay.status === 'committed') {
        const owner = await input.readCommittedOwner();
        if (owner) return owner;
        throw new ConflictException(
          'Committed media command owner could not be read',
        );
      }
      throw new ConflictException('This media write is already in progress');
    }

    const attemptToken = randomUUID();
    const planned = await this.prepare(input, attemptToken);
    await this.journalBeforePut(input, attemptToken, planned);

    try {
      for (const item of planned) {
        await this.media.putCommandOwned(item.prepared, UPLOAD_TIMEOUT_MS);
        const confirmed = await this.integrityFence.withIntegrityMutation(
          (session) =>
            this.commandModel
              .findOneAndUpdate(
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
                    'planned_assets.$[planned].upload_state': 'confirmed',
                    lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
                  },
                },
                {
                  arrayFilters: [
                    {
                      'planned.role': item.role,
                      'planned.asset.object_key':
                        item.prepared.asset.object_key,
                    },
                  ],
                  returnDocument: 'after',
                  session,
                },
              )
              .lean(),
        );
        if (!confirmed) {
          throw new ConflictException(
            'Media write ownership was lost after upload',
          );
        }
      }

      const committing = await this.integrityFence.withIntegrityMutation(
        (session) =>
          this.commandModel
            .findOneAndUpdate(
              {
                request_key: input.requestKey,
                payload_hash: input.payloadHash,
                attempt_token: attemptToken,
                status: 'uploading',
                planned_assets: {
                  $not: {
                    $elemMatch: { upload_state: { $ne: 'confirmed' } },
                  },
                },
              },
              {
                $set: {
                  status: 'committing',
                  lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
                },
              },
              { returnDocument: 'after', session },
            )
            .lean(),
      );
      if (!committing) {
        throw new ConflictException('Media write was not fully uploaded');
      }

      return await this.commit(input, attemptToken, planned);
    } catch (error) {
      return this.resolveFailure(input, attemptToken, error);
    }
  }

  /** Recover a process crash after the durable journal but before owner commit. */
  async recoverExpiredCommands(limit = 25): Promise<number> {
    const now = new Date();
    const rows = (await this.commandModel
      .find({
        status: { $in: ['uploading', 'committing', 'compensating'] },
        ...expiredLeaseFilter(now),
      })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean()) as unknown as CommandRow[];
    let recovered = 0;
    for (const row of rows) {
      if (!row.attempt_token) continue;
      const compensationToken = randomUUID();
      const claimed = await this.integrityFence.withIntegrityMutation(
        (session) =>
          this.commandModel
            .findOneAndUpdate(
              {
                request_key: row.request_key,
                payload_hash: row.payload_hash,
                attempt_token: row.attempt_token,
                status: row.status,
                ...(row.status === 'compensating'
                  ? row.compensation_token
                    ? { compensation_token: row.compensation_token }
                    : { compensation_token: { $exists: false } }
                  : {}),
                ...expiredLeaseFilter(now),
              },
              {
                $set: {
                  status: 'compensating',
                  compensation_token: compensationToken,
                  lease_expires_at: new Date(
                    Date.now() + COMPENSATION_LEASE_MS,
                  ),
                  last_error:
                    'Expired durable media write requires fenced compensation',
                },
              },
              { returnDocument: 'after', session },
            )
            .lean(),
      );
      if (!claimed) continue;
      recovered += 1;
      await this.cleanup.compensateMediaWriteCommand(
        row.request_key,
        compensationToken,
      );
    }
    return recovered;
  }

  @Cron('45 */10 * * * *')
  async recoverExpiredCommandsOnSchedule() {
    try {
      const recovered = await this.recoverExpiredCommands();
      if (recovered > 0) {
        this.logger.log(
          `Recovered ${recovered} expired durable media write(s)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Durable media write recovery failed: ${errorMessage(error)}`,
      );
    }
  }

  private async prepare<T>(
    input: PolicyMediaWriteInput<T>,
    attemptToken: string,
  ): Promise<Planned[]> {
    const planned: Planned[] = [];
    for (const upload of input.uploads) {
      const ownerKey = `${input.requestKey}:${upload.role}`;
      const prepared = await this.media.prepareCommandOwned(
        upload.file,
        upload.folder,
        ownerKey,
        attemptToken,
      );
      if (
        prepared.asset.owner_key !== ownerKey ||
        prepared.asset.owner_attempt_token !== attemptToken
      ) {
        throw new ConflictException(
          'Prepared media does not match its durable owner',
        );
      }
      planned.push({ role: upload.role, folder: upload.folder, prepared });
    }
    return planned;
  }

  private async journalBeforePut<T>(
    input: PolicyMediaWriteInput<T>,
    attemptToken: string,
    planned: Planned[],
  ) {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        await this.integrityFence.fenceReady(session);
        await this.commandModel.create(
          [
            {
              request_key: input.requestKey,
              payload_hash: input.payloadHash,
              owner_type: input.ownerType,
              owner_id: input.ownerId,
              operation: input.operation,
              status: 'uploading',
              attempt_token: attemptToken,
              lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
              attempts: 1,
              planned_assets: planned.map((item) => ({
                role: item.role,
                folder: item.folder,
                asset: item.prepared.asset,
                upload_state: 'planned',
              })),
            },
          ] as unknown as PolicyMediaWriteCommand[],
          { session },
        );
        for (const item of planned) {
          await this.registry.registerCommandOwnedInSession(
            item.prepared.asset,
            session,
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }

  private async commit<T>(
    input: PolicyMediaWriteInput<T>,
    attemptToken: string,
    planned: Planned[],
  ) {
    const assets = Object.fromEntries(
      planned.map((item) => [item.role, item.prepared.asset]),
    );
    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.integrityFence.fenceReady(session);
        const owned = await this.commandModel
          .findOne({
            request_key: input.requestKey,
            payload_hash: input.payloadHash,
            attempt_token: attemptToken,
            status: 'committing',
          })
          .session(session)
          .lean();
        if (!owned) {
          throw new ConflictException('Media write attempt is no longer owned');
        }
        for (const item of planned) {
          await this.registry.touchAttachInSession(
            item.prepared.asset.url,
            session,
          );
        }
        result = await input.commit(assets, session);
        const committed = await this.commandModel
          .findOneAndUpdate(
            {
              request_key: input.requestKey,
              payload_hash: input.payloadHash,
              attempt_token: attemptToken,
              status: 'committing',
            },
            {
              $set: {
                status: 'committed',
                response: { owner_id: String(input.ownerId) },
              },
              $unset: { lease_expires_at: 1, last_error: 1 },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!committed) {
          throw new ConflictException('Media write was lost before commit');
        }
      });
    } finally {
      await session.endSession();
    }
    if (result === undefined) {
      throw new InternalServerErrorException(
        'Media write committed without an owner result',
      );
    }
    return result;
  }

  private async resolveFailure<T>(
    input: PolicyMediaWriteInput<T>,
    attemptToken: string,
    failure: unknown,
  ): Promise<T> {
    let command: CommandRow | null;
    try {
      command = (await this.commandModel
        .findOne({
          request_key: input.requestKey,
          payload_hash: input.payloadHash,
          attempt_token: attemptToken,
        })
        .read('primary')
        .lean()) as CommandRow | null;
    } catch (readError) {
      throw new InternalServerErrorException(
        `Media write outcome is uncertain; cleanup was refused: ${errorMessage(readError)}`,
      );
    }

    if (!command) {
      throw new InternalServerErrorException(
        'Media write outcome is uncertain because its durable command is missing; cleanup was refused',
      );
    }

    if (command.status === 'committed') {
      let owner: T | null;
      try {
        owner = await input.readCommittedOwner();
      } catch (readError) {
        throw new InternalServerErrorException(
          `Committed media owner could not be confirmed; cleanup was refused: ${errorMessage(readError)}`,
        );
      }
      if (owner) return owner;
      throw new InternalServerErrorException(
        'Committed media owner is missing; cleanup was refused',
      );
    }

    const compensationToken = randomUUID();
    const compensating = await this.integrityFence.withIntegrityMutation(
      (session) =>
        this.commandModel
          .findOneAndUpdate(
            {
              request_key: input.requestKey,
              payload_hash: input.payloadHash,
              attempt_token: attemptToken,
              status: { $in: ['uploading', 'committing'] },
            },
            {
              $set: {
                status: 'compensating',
                compensation_token: compensationToken,
                lease_expires_at: new Date(Date.now() + WRITE_LEASE_MS),
                last_error: errorMessage(failure),
              },
            },
            { returnDocument: 'after', session },
          )
          .lean(),
    );
    if (compensating) {
      const cleaned = await this.cleanup.compensateMediaWriteCommand(
        input.requestKey,
        compensationToken,
      );
      if (!cleaned) {
        throw new InternalServerErrorException(
          'Media write failed and durable cleanup remains pending',
        );
      }
    }
    throw failure;
  }
}
