import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { isLegacyCronEnabled } from 'src/common/legacy-cron-gate';
import { createHash, randomUUID } from 'node:crypto';
import { ClientSession, Connection, Model, QueryFilter, Types } from 'mongoose';

import { mongoEq, requireTrimmedString } from 'src/common/mongo-query';
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
import { Category } from 'src/offer/schemas/category.schema';

import { AggregatePolicyCommandDto } from './dto/aggregate-policy.dto';
import {
  inspectPolicyTransactionCapability,
  policyTransactionsUnsupportedError,
  type PolicyTransactionCapability,
} from './policy-transaction-capability';
import { buildPolicyUpdate, parseAggregatePolicyJson } from './policy-write';
import {
  PolicyCategorySource,
  PolicyCategorySourceDocument,
} from './schemas/policy-category-source.schema';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandDocument,
} from './schemas/policy-lifecycle-command.schema';
import { Policy, PolicyDocument } from './schemas/policy.schema';
import { CategoryIntegrityService } from './category-integrity.service';
import { PolicyMediaAssetRegistryService } from './policy-media-asset-registry.service';
import { PolicyMediaCleanupService } from './policy-media-cleanup.service';
import { PolicyQaFailureInjectionHook } from './policy-qa-failure-injection.hook';

const POLICY_CATEGORY_ID_FACTORY = Symbol('POLICY_CATEGORY_ID_FACTORY');

const HASH_CATEGORY_ID = '000000000000000000000000';
const COMMAND_LEASE_MS = 2 * 60_000;
const COMPENSATION_LEASE_MS = 60_000;
const COMMAND_UPLOAD_TIMEOUT_MS = 30_000;
const MAX_COMMAND_ATTEMPTS = 20;

type AggregateResponse = {
  request_key: string;
  category: Record<string, unknown>;
  policy: Record<string, unknown>;
};

type CommandStatus = 'processing' | 'compensating' | 'committed' | 'failed';

type CommandRow = {
  _id?: unknown;
  request_key: string;
  payload_hash: string;
  category_id: Types.ObjectId;
  status: CommandStatus;
  attempt_token: string;
  compensation_token?: string;
  lease_expires_at?: Date;
  attempts: number;
  upload_state?: 'planned' | 'confirmed';
  planned_asset?: unknown;
  response?: AggregateResponse;
  last_error?: string;
};

type AttemptFence = Pick<
  CommandRow,
  'request_key' | 'payload_hash' | 'category_id' | 'attempt_token'
>;

type CommandClaimStep =
  | { kind: 'claimed'; command: CommandRow }
  | { kind: 'response'; response: AggregateResponse }
  | { kind: 'compensate'; command: CommandRow }
  | { kind: 'retry' };

type CleanupReason =
  | 'precommit-failure'
  | 'replaced-after-commit'
  | 'retired-purge'
  | 'content-delete'
  | 'category-purge';

type CleanupRow = {
  _id?: unknown;
  category_id: Types.ObjectId;
  request_key: string;
  payload_hash: string;
  attempt_token: string;
  reason: CleanupReason;
  asset: unknown;
  status: 'pending' | 'deleted';
};

export type { PolicyTransactionCapability } from './policy-transaction-capability';

function normalizedCategoryName(value: string) {
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!name) throw new BadRequestException('category_name is required');
  return { name, nameNormalized: name.toLocaleLowerCase('en-US') };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { toObject?: () => Record<string, unknown> };
  return candidate.toObject ? candidate.toObject() : { ...(value as object) };
}

function serializable(value: Record<string, unknown>) {
  const out = { ...value };
  if (out._id != null) out._id = String(out._id);
  if (out.category_id != null) out.category_id = String(out.category_id);
  return out;
}

function activeCategoryFilter(
  extra: QueryFilter<Category>,
): QueryFilter<Category> {
  return {
    ...extra,
    $or: [
      { lifecycle_status: 'active' },
      { lifecycle_status: { $exists: false } },
    ],
  };
}

function commandOwnedAsset(
  value: unknown,
): CommandOwnedStoredMediaAsset | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const asset = value as Partial<CommandOwnedStoredMediaAsset>;
  if (
    asset.provider !== 'r2' ||
    asset.ownership !== 'command-owned' ||
    typeof asset.owner_key !== 'string' ||
    typeof asset.owner_attempt_token !== 'string' ||
    !asset.owner_attempt_token ||
    typeof asset.url !== 'string' ||
    typeof asset.bucket !== 'string' ||
    typeof asset.object_key !== 'string' ||
    typeof asset.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    typeof asset.original_name !== 'string'
  ) {
    return undefined;
  }
  return asset as CommandOwnedStoredMediaAsset;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown policy save error';
}

function leaseIsActive(row: CommandRow, now: Date) {
  return Boolean(
    row.lease_expires_at &&
    new Date(row.lease_expires_at).getTime() > now.getTime(),
  );
}

function expiredLeaseFilter(now: Date) {
  return {
    $or: [
      { lease_expires_at: { $lte: now } },
      { lease_expires_at: { $exists: false } },
    ],
  };
}

function fenceFilter(fence: AttemptFence) {
  return {
    request_key: fence.request_key,
    payload_hash: fence.payload_hash,
    attempt_token: fence.attempt_token,
  };
}

function asCommandRow(value: unknown): CommandRow {
  return value as CommandRow;
}

@Injectable()
export class PolicyAggregateService {
  private readonly logger = new Logger(PolicyAggregateService.name);
  private transactionCapabilityCache:
    { checkedAt: number; value: PolicyTransactionCapability } | undefined;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(PolicyLifecycleCommand.name)
    private readonly commandModel: Model<PolicyLifecycleCommandDocument>,
    @InjectModel(PolicyCategorySource.name)
    private readonly sourceModel: Model<PolicyCategorySourceDocument>,
    private readonly media: StoredMediaService,
    private readonly categoryIntegrity: CategoryIntegrityService,
    private readonly mediaRegistry: PolicyMediaAssetRegistryService,
    private readonly mediaCleanup: PolicyMediaCleanupService,
    private readonly qaFailureInjection: PolicyQaFailureInjectionHook,
    @Optional()
    @Inject(POLICY_CATEGORY_ID_FACTORY)
    private readonly idFactory: () => Types.ObjectId = () =>
      new Types.ObjectId(),
  ) {}

  async execute(
    dto: AggregatePolicyCommandDto,
    defaultBanner?: Express.Multer.File,
  ): Promise<AggregateResponse> {
    const commandDto: AggregatePolicyCommandDto = {
      ...dto,
      request_key: requireTrimmedString(dto.request_key, 160, 'request_key'),
    };
    await this.assertTransactionsAvailable();
    await this.categoryIntegrity.assertReady();
    if (defaultBanner && !defaultBanner.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Default banner must be an image file');
    }

    const { name, nameNormalized } = normalizedCategoryName(
      commandDto.category_name,
    );
    const hashPolicy = parseAggregatePolicyJson(
      commandDto.policy,
      HASH_CATEGORY_ID,
    );
    // Catch all content-shape contradictions before any command state exists.
    buildPolicyUpdate(hashPolicy, { existingPolicy: true });

    const fileIdentity = defaultBanner
      ? await (async () => {
          const raw = await readMulterUploadBuffer(defaultBanner);
          const declaredSize = Number(defaultBanner.size);
          return {
            sha256: createHash('sha256').update(raw).digest('hex'),
            original_name: canonicalMediaOriginalName(
              defaultBanner.originalname,
            ),
            content_type: canonicalMediaContentType(defaultBanner.mimetype),
            size:
              Number.isSafeInteger(declaredSize) && declaredSize >= 0
                ? declaredSize
                : raw.length,
          };
        })()
      : null;
    const payloadHash = createHash('sha256')
      .update(
        JSON.stringify(
          stable({
            category_id: commandDto.category_id ?? null,
            category_name: name,
            icon_key: commandDto.icon_key,
            policy: hashPolicy,
            default_banner: fileIdentity,
          }),
        ),
      )
      .digest('hex');

    const replay = await this.readCommittedReplay(
      commandDto.request_key,
      payloadHash,
    );
    if (replay) return replay;

    // Every cheap, read-only domain check happens before command creation or
    // upload preparation. The transaction repeats the authoritative checks.
    await this.preflight(commandDto, name, nameNormalized, hashPolicy);

    const claimed = await this.claimCommand(
      commandDto,
      payloadHash,
      randomUUID(),
    );
    if ('response' in claimed) return claimed.response;
    const command = asCommandRow(claimed);
    const fence: AttemptFence = {
      request_key: command.request_key,
      payload_hash: command.payload_hash,
      category_id: new Types.ObjectId(String(command.category_id)),
      attempt_token: command.attempt_token,
    };
    const policyDto = parseAggregatePolicyJson(
      commandDto.policy,
      String(fence.category_id),
    );

    try {
      const uploadedAsset = defaultBanner
        ? await this.journalAndPut(fence, defaultBanner)
        : undefined;
      if (
        uploadedAsset &&
        this.qaFailureInjection.consumeOnce({
          environment: process.env.RAILWAY_ENVIRONMENT_NAME as
            'dev' | 'staging',
          candidate_sha: process.env.RAILWAY_GIT_COMMIT_SHA ?? '',
          request_key: commandDto.request_key,
          failure_point: 'after-media-put-before-db-commit',
        })
      ) {
        throw new Error(
          'Controlled policy QA failure after media upload and before database commit',
        );
      }
      const { response, postCommitCleanup } = await this.commitAggregate({
        dto: commandDto,
        fence,
        name,
        nameNormalized,
        policyDto,
        uploadedAsset,
      });
      for (const cleanup of postCommitCleanup) {
        await this.tryPostCommitCleanup(cleanup);
      }
      return response;
    } catch (error) {
      const committed = await this.readCommittedReplay(
        fence.request_key,
        fence.payload_hash,
      );
      if (committed) return committed;

      // This CAS is the only path from processing to compensation. If another
      // attempt owns the command, the stale worker performs no delete or state
      // update at all.
      const compensating = await this.beginCompensation(fence, error);
      if (compensating) {
        await this.completeCompensation(asCommandRow(compensating));
      }
      throw error;
    }
  }

  async getTransactionCapability(
    force = false,
  ): Promise<PolicyTransactionCapability> {
    const now = Date.now();
    if (
      !force &&
      this.transactionCapabilityCache &&
      now - this.transactionCapabilityCache.checkedAt < 15_000
    ) {
      return this.transactionCapabilityCache.value;
    }

    const value = await inspectPolicyTransactionCapability(this.connection);
    this.transactionCapabilityCache = { checkedAt: now, value };
    return value;
  }

  async assertTransactionsAvailable() {
    const capability = await this.getTransactionCapability();
    if (!capability.supported) {
      // Structured body matches policyIntegrityReadinessError — admin toasts
      // read `message` and append `reason` for ops-actionable detail (#407).
      throw new ServiceUnavailableException(
        policyTransactionsUnsupportedError(capability),
      );
    }
  }

  /** Recover abandoned command attempts without requiring a client retry. */
  async recoverExpiredCommands(limit = 25): Promise<number> {
    const now = new Date();
    const rows = await this.commandModel
      .find({
        status: { $in: ['processing', 'compensating'] },
        ...expiredLeaseFilter(now),
      })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean();
    let recovered = 0;
    for (const raw of rows) {
      const row = asCommandRow(raw);
      if (!row.attempt_token) continue;
      if (row.status === 'processing') {
        if (row.planned_asset || row.upload_state) {
          const moved = await this.categoryIntegrity.withIntegrityMutation(
            (session) => this.moveExpiredToCompensating(row, now, session),
          );
          if (moved) {
            recovered += 1;
            await this.completeCompensation(asCommandRow(moved));
          }
        } else {
          const failed = await this.categoryIntegrity.withIntegrityMutation(
            (session) =>
              this.commandModel
                .findOneAndUpdate(
                  {
                    ...fenceFilter(row),
                    status: 'processing',
                    ...expiredLeaseFilter(now),
                  },
                  {
                    $set: {
                      status: 'failed',
                      last_error: 'Expired policy save recovered without media',
                    },
                    $unset: { lease_expires_at: 1 },
                  },
                  { returnDocument: 'after', session },
                )
                .lean(),
          );
          if (failed) recovered += 1;
        }
      } else if (row.status === 'compensating') {
        const renewed = await this.categoryIntegrity.withIntegrityMutation(
          (session) => this.renewExpiredCompensation(row, now, session),
        );
        if (renewed) {
          recovered += 1;
          await this.completeCompensation(asCommandRow(renewed));
        }
      }
    }
    return recovered;
  }

  /** Retry only post-commit replacement tombstones; command cleanup is fenced above. */
  async retryPendingCleanup(limit = 25): Promise<number> {
    const result =
      await this.mediaCleanup.retryPendingLegacyReplacements(limit);
    return result.deleted;
  }

  @Cron('0 */10 * * * *')
  async retryPendingCleanupOnSchedule() {
    if (!isLegacyCronEnabled()) return;
    try {
      const recovered = await this.recoverExpiredCommands();
      const deleted = await this.retryPendingCleanup();
      if (recovered > 0 || deleted > 0) {
        this.logger.log(
          `Policy recovery handled ${recovered} command(s) and ${deleted} replacement object(s)`,
        );
      }
    } catch (error) {
      this.logger.error(`Policy recovery failed: ${errorMessage(error)}`);
    }
  }

  private async readCommittedReplay(
    requestKey: string,
    payloadHash: string,
  ): Promise<AggregateResponse | undefined> {
    const existing = await this.commandModel
      .findOne({ request_key: mongoEq(requestKey) })
      .lean();
    if (!existing) return undefined;
    if (existing.payload_hash !== payloadHash) {
      throw new ConflictException(
        'request_key was already used for a different policy payload',
      );
    }
    if (existing.status === 'committed' && existing.response) {
      return existing.response as AggregateResponse;
    }
    return undefined;
  }

  private async preflight(
    dto: AggregatePolicyCommandDto,
    name: string,
    nameNormalized: string,
    hashPolicy: ReturnType<typeof parseAggregatePolicyJson>,
  ) {
    await this.assertSourceIdentityAvailable(
      nameNormalized,
      dto.category_id ? new Types.ObjectId(dto.category_id) : undefined,
    );
    if (!dto.category_id) {
      buildPolicyUpdate(hashPolicy, {
        existingPolicy: false,
        requireBanner: true,
      });
      const duplicate = await this.findDuplicateCategory(nameNormalized);
      if (duplicate) {
        throw new ConflictException(
          `A category named "${name}" already exists.`,
        );
      }
      return;
    }

    const categoryId = new Types.ObjectId(dto.category_id);
    const [existingCategory, duplicateCategory, existingPolicy] =
      await Promise.all([
        this.categoryModel
          .findOne(activeCategoryFilter({ _id: categoryId }))
          .lean(),
        this.findDuplicateCategory(nameNormalized, categoryId),
        this.policyModel.findOne({ category_id: categoryId }).lean(),
      ]);
    if (!existingCategory) {
      throw new NotFoundException('Category not found or inactive');
    }
    if (duplicateCategory) {
      throw new ConflictException(`A category named "${name}" already exists.`);
    }
    buildPolicyUpdate(
      parseAggregatePolicyJson(dto.policy, String(categoryId)),
      { existingPolicy: Boolean(existingPolicy) },
    );
  }

  private async assertSourceIdentityAvailable(
    sourceKey: string,
    categoryId?: Types.ObjectId,
    session?: Awaited<ReturnType<Connection['startSession']>>,
  ) {
    let query = this.sourceModel.findOne({
      source_key: sourceKey,
      tombstoned: true,
    });
    if (session) query = query.session(session);
    const tombstone = await query.lean();
    if (tombstone) {
      throw new ConflictException(
        `Category identity "${sourceKey}" was retired and cannot be recreated.`,
      );
    }
    let activeQuery = this.sourceModel.findOne({
      source_key: sourceKey,
      active: true,
      ...(categoryId ? { category_id: { $ne: categoryId } } : {}),
    });
    if (session) activeQuery = activeQuery.session(session);
    if (await activeQuery.lean()) {
      throw new ConflictException(
        `Category identity "${sourceKey}" already belongs to another category.`,
      );
    }
  }

  private async findDuplicateCategory(
    nameNormalized: string,
    excludeId?: Types.ObjectId,
    session?: Awaited<ReturnType<Connection['startSession']>>,
  ) {
    const exclude = excludeId ? { _id: { $ne: excludeId } } : {};
    let exactQuery = this.categoryModel.findOne(
      activeCategoryFilter({ name_normalized: nameNormalized, ...exclude }),
    );
    if (session) exactQuery = exactQuery.session(session);
    const exact = await exactQuery.lean();
    if (exact) return exact;

    let legacyQuery = this.categoryModel.find(
      activeCategoryFilter({
        name_normalized: { $exists: false },
        ...exclude,
      }),
      { _id: 1, name: 1 },
    );
    if (session) legacyQuery = legacyQuery.session(session);
    const legacy = await legacyQuery.lean();
    for (const category of legacy) {
      if (
        typeof category.name !== 'string' ||
        !category.name.normalize('NFKC').trim()
      ) {
        throw new ConflictException(
          'Legacy category identity data is invalid; repair it before saving policies.',
        );
      }
      if (
        normalizedCategoryName(category.name).nameNormalized === nameNormalized
      ) {
        return category;
      }
    }
    return undefined;
  }

  private async claimCommand(
    dto: AggregatePolicyCommandDto,
    payloadHash: string,
    initialAttemptToken: string,
  ): Promise<CommandRow | { response: AggregateResponse }> {
    let nextAttemptToken = initialAttemptToken;
    for (let pass = 0; pass < 8; pass += 1) {
      let step: CommandClaimStep;
      try {
        step = await this.categoryIntegrity.withIntegrityMutation((session) =>
          this.claimCommandStep(dto, payloadHash, nextAttemptToken, session),
        );
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 11000
        ) {
          continue;
        }
        throw error;
      }
      if (step.kind === 'claimed') return step.command;
      if (step.kind === 'response') return { response: step.response };
      if (step.kind === 'retry') continue;
      if (!(await this.completeCompensation(step.command))) {
        throw new ConflictException(
          'Previous policy media cleanup is still pending',
        );
      }
      nextAttemptToken = randomUUID();
    }
    throw new ConflictException('This policy save changed concurrently');
  }

  private async claimCommandStep(
    dto: AggregatePolicyCommandDto,
    payloadHash: string,
    nextAttemptToken: string,
    session: ClientSession,
  ): Promise<CommandClaimStep> {
    const existing = await this.commandModel
      .findOne({ request_key: mongoEq(dto.request_key) })
      .session(session)
      .lean();
    if (!existing) {
      const created: CommandRow = {
        request_key: dto.request_key,
        payload_hash: payloadHash,
        category_id: dto.category_id
          ? new Types.ObjectId(dto.category_id)
          : this.idFactory(),
        status: 'processing',
        attempt_token: nextAttemptToken,
        lease_expires_at: new Date(Date.now() + COMMAND_LEASE_MS),
        attempts: 1,
      };
      await this.commandModel.create(
        [created as unknown as PolicyLifecycleCommand],
        { session },
      );
      return { kind: 'claimed', command: created };
    }

    const row = asCommandRow(existing);
    if (row.payload_hash !== payloadHash) {
      throw new ConflictException(
        'request_key was already used for a different policy payload',
      );
    }
    if (row.status === 'committed' && row.response) {
      return { kind: 'response', response: row.response };
    }
    if (!row.attempt_token) {
      throw new ConflictException(
        'Policy save command is missing an attempt fence and requires repair',
      );
    }

    const now = new Date();
    if (row.status === 'processing') {
      if (leaseIsActive(row, now)) {
        throw new ConflictException('This policy save is still processing');
      }
      if (row.planned_asset || row.upload_state) {
        const moved = await this.moveExpiredToCompensating(row, now, session);
        return moved
          ? { kind: 'compensate', command: asCommandRow(moved) }
          : { kind: 'retry' };
      }
      if ((row.attempts ?? 0) >= MAX_COMMAND_ATTEMPTS) {
        throw new ConflictException('Policy save retry limit was reached');
      }
      const reclaimedAttemptToken = randomUUID();
      const reclaimed = await this.commandModel
        .findOneAndUpdate(
          {
            ...fenceFilter(row),
            status: 'processing',
            ...expiredLeaseFilter(now),
            'planned_asset.object_key': { $exists: false },
            upload_state: { $exists: false },
          },
          {
            $set: {
              attempt_token: reclaimedAttemptToken,
              lease_expires_at: new Date(Date.now() + COMMAND_LEASE_MS),
            },
            $unset: {
              compensation_token: 1,
              compensation_claimed_at: 1,
              last_error: 1,
            },
            $inc: { attempts: 1 },
          },
          { returnDocument: 'after', session },
        )
        .lean();
      return reclaimed
        ? { kind: 'claimed', command: asCommandRow(reclaimed) }
        : { kind: 'retry' };
    }

    if (row.status === 'compensating') {
      if (leaseIsActive(row, now)) {
        throw new ConflictException(
          'Previous policy media cleanup is still pending',
        );
      }
      const renewed = await this.renewExpiredCompensation(row, now, session);
      return renewed
        ? { kind: 'compensate', command: asCommandRow(renewed) }
        : { kind: 'retry' };
    }

    if (row.status === 'failed') {
      if (row.planned_asset || row.upload_state) {
        throw new ConflictException(
          'Policy save failed with uncleared media and requires recovery',
        );
      }
      if ((row.attempts ?? 0) >= MAX_COMMAND_ATTEMPTS) {
        throw new ConflictException('Policy save retry limit was reached');
      }
      const claimedAttemptToken = randomUUID();
      const claimed = await this.commandModel
        .findOneAndUpdate(
          {
            ...fenceFilter(row),
            status: 'failed',
            'planned_asset.object_key': { $exists: false },
            upload_state: { $exists: false },
          },
          {
            $set: {
              status: 'processing',
              attempt_token: claimedAttemptToken,
              lease_expires_at: new Date(Date.now() + COMMAND_LEASE_MS),
            },
            $unset: {
              compensation_token: 1,
              compensation_claimed_at: 1,
              last_error: 1,
            },
            $inc: { attempts: 1 },
          },
          { returnDocument: 'after', session },
        )
        .lean();
      return claimed
        ? { kind: 'claimed', command: asCommandRow(claimed) }
        : { kind: 'retry' };
    }
    return { kind: 'retry' };
  }

  private async journalAndPut(
    fence: AttemptFence,
    file: Express.Multer.File,
  ): Promise<CommandOwnedStoredMediaAsset> {
    const prepared: PreparedCommandOwnedUpload =
      await this.media.prepareCommandOwned(
        file,
        MEDIA_FOLDER.CATEGORIES,
        fence.request_key,
        fence.attempt_token,
      );
    const preparedAsset = commandOwnedAsset(prepared.asset);
    if (
      !preparedAsset ||
      preparedAsset.owner_key !== fence.request_key ||
      preparedAsset.owner_attempt_token !== fence.attempt_token
    ) {
      throw new ConflictException(
        'Prepared policy media does not match the command owner',
      );
    }
    const session = await this.connection.startSession();
    let planned: unknown;
    try {
      await session.withTransaction(async () => {
        planned = undefined;
        await this.categoryIntegrity.fenceReady(session);
        const updated = await this.commandModel
          .findOneAndUpdate(
            {
              ...fenceFilter(fence),
              status: 'processing',
              'planned_asset.object_key': { $exists: false },
              upload_state: { $exists: false },
            },
            {
              $set: {
                planned_asset: preparedAsset,
                upload_state: 'planned',
                lease_expires_at: new Date(Date.now() + COMMAND_LEASE_MS),
              },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!updated) return;
        await this.mediaRegistry.registerCommandOwnedInSession(
          preparedAsset,
          session,
        );
        planned = updated;
      });
    } finally {
      await session.endSession();
    }
    if (!planned) {
      throw new ConflictException('Policy save lease was lost before upload');
    }

    await this.media.putCommandOwned(
      { ...prepared, asset: preparedAsset },
      COMMAND_UPLOAD_TIMEOUT_MS,
    );
    const confirmed = await this.categoryIntegrity.withIntegrityMutation(
      (session) =>
        this.commandModel
          .findOneAndUpdate(
            {
              ...fenceFilter(fence),
              status: 'processing',
              upload_state: 'planned',
              'planned_asset.object_key': preparedAsset.object_key,
            },
            {
              $set: {
                upload_state: 'confirmed',
                lease_expires_at: new Date(Date.now() + COMMAND_LEASE_MS),
              },
            },
            { returnDocument: 'after', session },
          )
          .lean(),
    );
    if (!confirmed) {
      throw new ConflictException(
        'Policy save attempt was lost after the upload',
      );
    }
    return preparedAsset;
  }

  private async commitAggregate(input: {
    dto: AggregatePolicyCommandDto;
    fence: AttemptFence;
    name: string;
    nameNormalized: string;
    policyDto: ReturnType<typeof parseAggregatePolicyJson>;
    uploadedAsset?: CommandOwnedStoredMediaAsset;
  }): Promise<{
    response: AggregateResponse;
    postCommitCleanup: CleanupRow[];
  }> {
    const { dto, fence, name, nameNormalized, policyDto, uploadedAsset } =
      input;
    const postCommitCleanup: CleanupRow[] = [];
    let response: AggregateResponse | undefined;
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        // Mongoose may retry this callback on transient transaction errors.
        // Keep post-commit work scoped to the final successful attempt.
        postCommitCleanup.length = 0;
        response = undefined;
        await this.categoryIntegrity.fenceReady(session);
        const ownedCommand = await this.commandModel
          .findOne({
            ...fenceFilter(fence),
            status: 'processing',
            ...(uploadedAsset
              ? {
                  upload_state: 'confirmed',
                  'planned_asset.object_key': uploadedAsset.object_key,
                }
              : {
                  'planned_asset.object_key': { $exists: false },
                  upload_state: { $exists: false },
                }),
          })
          .session(session)
          .lean();
        if (!ownedCommand) {
          throw new ConflictException('Policy save attempt is no longer owned');
        }
        if (uploadedAsset) {
          await this.mediaRegistry.touchAttachInSession(
            uploadedAsset.url,
            session,
          );
        }

        const currentCategory = dto.category_id
          ? await this.categoryModel
              .findOne(activeCategoryFilter({ _id: fence.category_id }))
              .session(session)
              .lean()
          : null;
        const duplicateCategory = await this.findDuplicateCategory(
          nameNormalized,
          dto.category_id ? fence.category_id : undefined,
          session,
        );
        await this.assertSourceIdentityAvailable(
          nameNormalized,
          dto.category_id ? fence.category_id : undefined,
          session,
        );
        if (dto.category_id && !currentCategory) {
          throw new NotFoundException('Category not found or inactive');
        }
        if (duplicateCategory) {
          throw new ConflictException(
            `A category named "${name}" already exists.`,
          );
        }

        const currentPolicy = await this.policyModel
          .findOne({ category_id: fence.category_id })
          .session(session)
          .lean();
        const policyUpdate = buildPolicyUpdate(policyDto, {
          existingPolicy: Boolean(currentPolicy),
          requireBanner: !dto.category_id,
        });
        const previousAsset = commandOwnedAsset(currentCategory?.banner_asset);
        let savedCategory: unknown;
        if (!dto.category_id) {
          const created = await this.categoryModel.create(
            [
              {
                _id: fence.category_id,
                name,
                name_normalized: nameNormalized,
                icon_key: dto.icon_key,
                lifecycle_status: 'active',
                revision: 1,
                ...(uploadedAsset
                  ? {
                      banner: uploadedAsset.url,
                      banner_asset: uploadedAsset,
                    }
                  : {}),
              },
            ],
            { session },
          );
          savedCategory = created[0];
        } else {
          const set: Record<string, unknown> = {
            name,
            name_normalized: nameNormalized,
            icon_key: dto.icon_key,
            lifecycle_status: 'active',
          };
          if (uploadedAsset) {
            set.banner = uploadedAsset.url;
            set.banner_asset = uploadedAsset;
          }
          savedCategory = await this.categoryModel
            .findOneAndUpdate(
              activeCategoryFilter({ _id: fence.category_id }),
              { $set: set, $inc: { revision: 1 } },
              { returnDocument: 'after', session },
            )
            .lean();
        }
        if (!savedCategory) {
          throw new NotFoundException('Category not found or inactive');
        }

        const savedPolicy = await this.policyModel
          .findOneAndUpdate({ category_id: fence.category_id }, policyUpdate, {
            upsert: true,
            returnDocument: 'after',
            setDefaultsOnInsert: true,
            session,
          })
          .lean();
        await this.sourceModel
          .findOneAndUpdate(
            {
              category_id: fence.category_id,
              source: 'policy-admin',
              source_key: nameNormalized,
            },
            {
              $set: {
                request_key: dto.request_key,
                active: true,
              },
              $setOnInsert: {
                category_id: fence.category_id,
                source: 'policy-admin',
                source_key: nameNormalized,
                tombstoned: false,
                revision: 1,
              },
            },
            { upsert: true, returnDocument: 'after', session },
          )
          .lean();

        if (
          uploadedAsset &&
          previousAsset &&
          previousAsset.object_key !== uploadedAsset.object_key
        ) {
          const rows = await this.mediaCleanup.journalCommandOwnedAssets(
            {
              owner_type: 'category',
              owner_id: fence.category_id,
              request_key: fence.request_key,
              payload_hash: fence.payload_hash,
              attempt_token: fence.attempt_token,
              reason: 'replaced-after-commit',
              assets: [previousAsset],
            },
            session,
          );
          postCommitCleanup.push(...(rows as CleanupRow[]));
        }

        response = {
          request_key: dto.request_key,
          category: serializable(plain(savedCategory)),
          policy: serializable(plain(savedPolicy)),
        };
        const committed = await this.commandModel
          .findOneAndUpdate(
            {
              ...fenceFilter(fence),
              status: 'processing',
              ...(uploadedAsset
                ? {
                    upload_state: 'confirmed',
                    'planned_asset.object_key': uploadedAsset.object_key,
                  }
                : {}),
            },
            {
              $set: {
                status: 'committed',
                response,
              },
              $unset: {
                lease_expires_at: 1,
                compensation_token: 1,
                compensation_claimed_at: 1,
                last_error: 1,
              },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!committed) {
          throw new ConflictException(
            'Policy save attempt was lost before commit',
          );
        }
      });
    } finally {
      await session.endSession();
    }
    if (!response) {
      throw new Error(
        'Policy aggregate transaction completed without a response',
      );
    }
    return { response, postCommitCleanup };
  }

  private async beginCompensation(fence: AttemptFence, error: unknown) {
    const compensationToken = randomUUID();
    return this.categoryIntegrity.withIntegrityMutation((session) =>
      this.commandModel
        .findOneAndUpdate(
          { ...fenceFilter(fence), status: 'processing' },
          {
            $set: {
              status: 'compensating',
              compensation_token: compensationToken,
              last_error: errorMessage(error),
              lease_expires_at: new Date(Date.now() + COMPENSATION_LEASE_MS),
            },
            $unset: { compensation_claimed_at: 1 },
          },
          { returnDocument: 'after', session },
        )
        .lean(),
    );
  }

  private async moveExpiredToCompensating(
    row: CommandRow,
    now: Date,
    session?: ClientSession,
  ) {
    const compensationToken = randomUUID();
    return this.commandModel
      .findOneAndUpdate(
        {
          ...fenceFilter(row),
          status: 'processing',
          ...expiredLeaseFilter(now),
          $and: [
            {
              $or: [
                { 'planned_asset.object_key': { $exists: true } },
                { upload_state: { $exists: true } },
              ],
            },
          ],
        },
        {
          $set: {
            status: 'compensating',
            compensation_token: compensationToken,
            last_error: 'Expired policy save requires fenced media cleanup',
            lease_expires_at: new Date(Date.now() + COMPENSATION_LEASE_MS),
          },
          $unset: { compensation_claimed_at: 1 },
        },
        { returnDocument: 'after', ...(session ? { session } : {}) },
      )
      .lean();
  }

  private async renewExpiredCompensation(
    row: CommandRow,
    now: Date,
    session?: ClientSession,
  ) {
    if (!row.compensation_token) return null;
    const compensationToken = randomUUID();
    return this.commandModel
      .findOneAndUpdate(
        {
          ...fenceFilter(row),
          status: 'compensating',
          compensation_token: row.compensation_token,
          ...expiredLeaseFilter(now),
        },
        {
          $set: {
            compensation_token: compensationToken,
            lease_expires_at: new Date(Date.now() + COMPENSATION_LEASE_MS),
          },
          $unset: { compensation_claimed_at: 1 },
        },
        { returnDocument: 'after', ...(session ? { session } : {}) },
      )
      .lean();
  }

  private async completeCompensation(row: CommandRow): Promise<boolean> {
    if (!row.compensation_token) return false;
    return this.mediaCleanup.compensateLifecycleCommand(
      row.request_key,
      row.compensation_token,
    );
  }

  private async tryPostCommitCleanup(row: CleanupRow): Promise<boolean> {
    if (row.reason === 'precommit-failure') return false;
    const result = await this.mediaCleanup.processRequest(row.request_key);
    return result.deleted > 0;
  }
}
