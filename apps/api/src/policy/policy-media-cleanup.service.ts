import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import { createHash } from 'node:crypto';
import { ClientSession, Model, Types } from 'mongoose';

import { isLegacyCronEnabled } from 'src/common/legacy-cron-gate';
import { MEDIA_FOLDER, MediaFolder } from 'src/media/media-folders.config';
import {
  CommandOwnedStoredMediaAsset,
  StoredMediaService,
} from 'src/media/stored-media.service';
import {
  mongoEq,
  requireOneOf,
  requireTrimmedString,
} from 'src/common/mongo-query';

import { PolicyMediaAssetRegistryService } from './policy-media-asset-registry.service';
import { PolicyIntegrityFenceService } from './policy-integrity-fence.service';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandDocument,
} from './schemas/policy-lifecycle-command.schema';
import {
  PolicyMediaCleanup,
  PolicyMediaCleanupDocument,
} from './schemas/policy-media-cleanup.schema';
import {
  PolicyMediaWriteCommand,
  PolicyMediaWriteCommandDocument,
} from './schemas/policy-media-write-command.schema';

export const LEGACY_REPLACEMENT_CLEANUP_REASONS = [
  'legacy-category-replaced',
  'offer-replaced',
] as const;
export type LegacyReplacementCleanupReason =
  (typeof LEGACY_REPLACEMENT_CLEANUP_REASONS)[number];
const UNCERTAIN_UPLOAD_CLEANUP_REASON = 'ambiguous-upload' as const;

export type AutomaticCleanupReason =
  | 'precommit-failure'
  | 'replaced-after-commit'
  | 'retired-purge'
  | 'content-delete'
  | 'category-purge'
  | LegacyReplacementCleanupReason;

type CleanupJournalIdentity = {
  owner_type: 'category' | 'offer';
  owner_id: Types.ObjectId;
  request_key: string;
  attempt_token: string;
  reason: AutomaticCleanupReason | typeof UNCERTAIN_UPLOAD_CLEANUP_REASON;
};

export type LegacyReplacementJournal = CleanupJournalIdentity & {
  reason: LegacyReplacementCleanupReason;
  references: unknown[];
};

export type UncertainUploadJournal = Omit<CleanupJournalIdentity, 'reason'> & {
  references: unknown[];
};

export type CommandOwnedCleanupJournal = CleanupJournalIdentity & {
  reason: AutomaticCleanupReason;
  payload_hash: string;
  assets: CommandOwnedStoredMediaAsset[];
};

type CleanupJournalRecord = CleanupJournalIdentity & {
  payload_hash: string;
};

type LegacyUnverifiedAsset = {
  provider: 'legacy-unverified';
  ownership: 'legacy-unverified';
  url: string;
  object_key: string;
  sha256: string;
  original_name: string;
};
type CleanupAsset = CommandOwnedStoredMediaAsset | LegacyUnverifiedAsset;

type CleanupRow = {
  _id: Types.ObjectId;
  category_id?: Types.ObjectId;
  owner_type?: 'category' | 'offer';
  owner_id?: Types.ObjectId;
  request_key: string;
  payload_hash: string;
  attempt_token: string;
  reason: AutomaticCleanupReason | typeof UNCERTAIN_UPLOAD_CLEANUP_REASON;
  asset: CleanupAsset;
  status: 'pending' | 'deleted';
  attempts: number;
  worker_token?: string;
  reconciliation_required?: boolean;
};

const AUTOMATIC_REASONS: AutomaticCleanupReason[] = [
  'precommit-failure',
  'replaced-after-commit',
  'retired-purge',
  'content-delete',
  'category-purge',
  ...LEGACY_REPLACEMENT_CLEANUP_REASONS,
];
const CLEANUP_OWNER_TYPES = ['category', 'offer'] as const;
const CLEANUP_REASONS = [
  ...AUTOMATIC_REASONS,
  UNCERTAIN_UPLOAD_CLEANUP_REASON,
] as const;

function normalizedCleanupIdentity<T extends CleanupJournalIdentity>(
  input: T,
): T {
  return {
    ...input,
    owner_type: requireOneOf(
      input.owner_type,
      CLEANUP_OWNER_TYPES,
      'cleanup owner type',
    ),
    request_key: requireTrimmedString(
      input.request_key,
      500,
      'cleanup request key',
    ),
    attempt_token: requireTrimmedString(
      input.attempt_token,
      200,
      'cleanup attempt token',
    ),
    reason: requireOneOf(input.reason, CLEANUP_REASONS, 'cleanup reason'),
  } as T;
}

function requirePayloadHash(value: string): string {
  const hash = requireTrimmedString(value, 64, 'cleanup payload hash');
  if (!/^[a-f0-9]{64}$/.test(hash)) {
    throw new BadRequestException(
      'The cleanup payload hash you provided is not valid.',
    );
  }
  return hash;
}

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const candidate = value as { toObject?: () => Record<string, unknown> };
  return candidate.toObject
    ? candidate.toObject()
    : { ...(value as Record<string, unknown>) };
}

function referenceHash(reference: string) {
  return createHash('sha256').update(reference).digest('hex');
}

function commandOwnedAsset(
  value: unknown,
): CommandOwnedStoredMediaAsset | undefined {
  const asset = plain(value);
  if (
    asset.provider !== 'r2' ||
    asset.ownership !== 'command-owned' ||
    typeof asset.owner_key !== 'string' ||
    !asset.owner_key ||
    typeof asset.owner_attempt_token !== 'string' ||
    !asset.owner_attempt_token ||
    typeof asset.url !== 'string' ||
    !asset.url.trim() ||
    typeof asset.bucket !== 'string' ||
    !asset.bucket ||
    typeof asset.object_key !== 'string' ||
    !asset.object_key ||
    typeof asset.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    typeof asset.original_name !== 'string' ||
    !asset.original_name
  ) {
    return undefined;
  }
  return {
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: asset.owner_key,
    owner_attempt_token: asset.owner_attempt_token,
    url: asset.url.trim(),
    bucket: asset.bucket,
    object_key: asset.object_key,
    sha256: asset.sha256,
    original_name: asset.original_name,
    ...(typeof asset.content_type === 'string'
      ? { content_type: asset.content_type }
      : {}),
  };
}

function legacyAsset(value: unknown): LegacyUnverifiedAsset | undefined {
  if (typeof value !== 'string') return undefined;
  const reference = value.trim();
  if (!reference) return undefined;
  const hash = referenceHash(reference);
  return {
    provider: 'legacy-unverified',
    ownership: 'legacy-unverified',
    url: reference,
    object_key: `legacy-reference/${hash}`,
    sha256: hash,
    original_name: `legacy-reference-${hash.slice(0, 16)}`,
  };
}

function cleanupAssets(values: unknown[]) {
  const assets = new Map<string, CleanupAsset>();
  for (const value of values) {
    const owned = commandOwnedAsset(value);
    const candidate = owned ?? legacyAsset(value);
    if (!candidate) continue;
    const current = assets.get(candidate.url);
    if (!current || owned) assets.set(candidate.url, candidate);
  }
  return [...assets.values()].sort((a, b) => a.url.localeCompare(b.url));
}

function assetForHash(asset: CleanupAsset) {
  return {
    provider: asset.provider,
    ownership: asset.ownership,
    ...(asset.provider === 'r2'
      ? {
          owner_key: asset.owner_key,
          owner_attempt_token: asset.owner_attempt_token,
          bucket: asset.bucket,
        }
      : {}),
    url: asset.url,
    object_key: asset.object_key,
    sha256: asset.sha256,
    original_name: asset.original_name,
    ...(asset.provider === 'r2' && asset.content_type
      ? { content_type: asset.content_type }
      : {}),
  };
}

function payloadHash(input: CleanupJournalIdentity, asset: CleanupAsset) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        owner_type: input.owner_type,
        owner_id: String(input.owner_id),
        request_key: input.request_key,
        attempt_token: input.attempt_token,
        reason: input.reason,
        asset: assetForHash(asset),
      }),
    )
    .digest('hex');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class PolicyMediaCleanupService {
  private readonly logger = new Logger(PolicyMediaCleanupService.name);

  constructor(
    @InjectModel(PolicyMediaCleanup.name)
    private readonly cleanupModel: Model<PolicyMediaCleanupDocument>,
    @InjectModel(PolicyLifecycleCommand.name)
    private readonly lifecycleCommandModel: Model<PolicyLifecycleCommandDocument>,
    @InjectModel(PolicyMediaWriteCommand.name)
    private readonly writeCommandModel: Model<PolicyMediaWriteCommandDocument>,
    private readonly media: StoredMediaService,
    private readonly registry: PolicyMediaAssetRegistryService,
    private readonly integrityFence: PolicyIntegrityFenceService,
  ) {}

  async journalLegacyReplacements(
    input: LegacyReplacementJournal,
    session: ClientSession,
  ) {
    const normalizedInput = normalizedCleanupIdentity(input);
    const rows: unknown[] = [];
    for (const asset of cleanupAssets(normalizedInput.references)) {
      const hash = payloadHash(normalizedInput, asset);
      rows.push(
        await this.upsertJournal(
          { ...normalizedInput, payload_hash: hash },
          asset,
          session,
          false,
        ),
      );
    }
    return rows;
  }

  async journalCommandOwnedAssets(
    input: CommandOwnedCleanupJournal,
    session: ClientSession,
  ) {
    const normalizedInput: CommandOwnedCleanupJournal = {
      ...normalizedCleanupIdentity(input),
      payload_hash: requirePayloadHash(input.payload_hash),
    };
    const rows: unknown[] = [];
    for (const candidate of normalizedInput.assets) {
      const asset = commandOwnedAsset(candidate);
      if (!asset) {
        throw new Error('Refusing to journal invalid command-owned media');
      }
      rows.push(
        await this.upsertJournal(normalizedInput, asset, session, false),
      );
    }
    return rows;
  }

  /** Compatibility quarantine only. New writers must use pre-Put commands. */
  async journalUncertainUploads(input: UncertainUploadJournal) {
    const identity = normalizedCleanupIdentity({
      owner_type: input.owner_type,
      owner_id: input.owner_id,
      request_key: input.request_key,
      attempt_token: input.attempt_token,
      reason: UNCERTAIN_UPLOAD_CLEANUP_REASON,
    });
    const rows: unknown[] = [];
    for (const asset of cleanupAssets(input.references)) {
      const hash = payloadHash(identity, asset);
      rows.push(
        await this.upsertJournal(
          { ...identity, payload_hash: hash },
          asset,
          undefined,
          true,
        ),
      );
    }
    return rows;
  }

  private async upsertJournal(
    input: CleanupJournalRecord,
    asset: CleanupAsset,
    session?: ClientSession,
    reconciliationRequired = false,
  ) {
    const row = await this.cleanupModel
      .findOneAndUpdate(
        {
          request_key: mongoEq(input.request_key),
          payload_hash: mongoEq(input.payload_hash),
          attempt_token: mongoEq(input.attempt_token),
          reason: mongoEq(input.reason),
          'asset.object_key': mongoEq(asset.object_key),
        },
        {
          $setOnInsert: {
            owner_type: input.owner_type,
            owner_id: input.owner_id,
            ...(input.owner_type === 'category'
              ? { category_id: input.owner_id }
              : {}),
            request_key: input.request_key,
            payload_hash: input.payload_hash,
            attempt_token: input.attempt_token,
            reason: input.reason,
            asset,
            status: 'pending',
            attempts: 0,
            reconciliation_required: reconciliationRequired,
            ...(reconciliationRequired
              ? {
                  last_error:
                    'Transaction outcome is uncertain; fresh media was retained for explicit reconciliation',
                }
              : {}),
          },
        },
        {
          upsert: true,
          returnDocument: 'after',
          ...(session ? { session } : {}),
        },
      )
      .lean();
    if (!row) throw new Error('Policy media cleanup journal was not created');
    return row;
  }

  async processRequest(requestKey: string) {
    const normalizedRequestKey = requireTrimmedString(
      requestKey,
      500,
      'cleanup request key',
    );
    await this.integrityFence.assertReady();
    const rows = (await this.cleanupModel
      .find({
        request_key: mongoEq(normalizedRequestKey),
        status: 'pending',
        reconciliation_required: { $ne: true },
        reason: { $in: AUTOMATIC_REASONS },
      })
      .lean()) as unknown as CleanupRow[];
    return this.processRows(rows);
  }

  async retryPendingLegacyReplacements(limit = 25) {
    await this.integrityFence.assertReady();
    const rows = (await this.cleanupModel
      .find({
        status: 'pending',
        reconciliation_required: { $ne: true },
        reason: { $in: AUTOMATIC_REASONS },
      })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean()) as unknown as CleanupRow[];
    return this.processRows(rows);
  }

  @Cron('30 */10 * * * *')
  async retryPendingLegacyReplacementsOnSchedule() {
    if (!isLegacyCronEnabled()) return;
    try {
      const result = await this.retryPendingLegacyReplacements();
      if (result.deleted > 0) {
        this.logger.log(`Deleted ${result.deleted} fenced media object(s)`);
      }
    } catch (error) {
      this.logger.error(`Media cleanup retry failed: ${errorMessage(error)}`);
    }
  }
  async compensateMediaWriteCommand(
    requestKey: string,
    compensationToken: string,
  ): Promise<boolean> {
    await this.integrityFence.withIntegrityMutation(async (session) => {
      const command = await this.writeCommandModel
        .findOne({
          request_key: requestKey,
          status: 'compensating',
          compensation_token: compensationToken,
        })
        .session(session)
        .lean();
      if (!command) throw new Error('Media compensation ownership was lost');
      await this.journalCommandOwnedAssets(
        {
          owner_type: command.owner_type,
          owner_id: command.owner_id,
          request_key: command.request_key,
          payload_hash: command.payload_hash,
          attempt_token: command.attempt_token,
          reason: 'precommit-failure',
          assets: (command.planned_assets ?? []).map(
            (item) => item.asset,
          ) as CommandOwnedStoredMediaAsset[],
        },
        session,
      );
    });
    const result = await this.processRequest(requestKey);
    if (result.pending > 0) return false;
    return this.integrityFence.withIntegrityMutation(async (session) =>
      Boolean(
        await this.writeCommandModel
          .findOneAndUpdate(
            {
              request_key: requestKey,
              status: 'compensating',
              compensation_token: compensationToken,
            },
            {
              $set: { status: 'failed' },
              $unset: { compensation_token: 1, lease_expires_at: 1 },
            },
            { returnDocument: 'after', session },
          )
          .lean(),
      ),
    );
  }

  async compensateLifecycleCommand(
    requestKey: string,
    compensationToken: string,
  ): Promise<boolean> {
    await this.integrityFence.withIntegrityMutation(async (session) => {
      const command = await this.lifecycleCommandModel
        .findOne({
          request_key: requestKey,
          status: 'compensating',
          compensation_token: compensationToken,
        })
        .session(session)
        .lean();
      if (!command) throw new Error('Policy compensation ownership was lost');
      const asset = commandOwnedAsset(command.planned_asset);
      if (!asset) {
        if (command.upload_state || command.planned_asset) {
          throw new Error(
            'Policy media journal is invalid; automatic deletion was refused',
          );
        }
        return;
      }
      await this.journalCommandOwnedAssets(
        {
          owner_type: 'category',
          owner_id: command.category_id,
          request_key: command.request_key,
          payload_hash: command.payload_hash,
          attempt_token: command.attempt_token,
          reason: 'precommit-failure',
          assets: [asset],
        },
        session,
      );
    });
    const result = await this.processRequest(requestKey);
    if (result.pending > 0) return false;
    return this.integrityFence.withIntegrityMutation(async (session) =>
      Boolean(
        await this.lifecycleCommandModel
          .findOneAndUpdate(
            {
              request_key: requestKey,
              status: 'compensating',
              compensation_token: compensationToken,
            },
            {
              $set: { status: 'failed' },
              $unset: {
                planned_asset: 1,
                upload_state: 1,
                compensation_token: 1,
                compensation_claimed_at: 1,
                lease_expires_at: 1,
              },
            },
            { returnDocument: 'after', session },
          )
          .lean(),
      ),
    );
  }

  private async processRows(rows: CleanupRow[]) {
    let deleted = 0;
    for (const row of rows) {
      if (await this.tryCleanup(row)) deleted += 1;
    }
    return { deleted, pending: rows.length - deleted };
  }

  private rowFence(row: CleanupRow) {
    return {
      _id: row._id,
      request_key: row.request_key,
      payload_hash: row.payload_hash,
      attempt_token: row.attempt_token,
      reason: row.reason,
      status: 'pending' as const,
      'asset.object_key': row.asset?.object_key,
      'asset.url': row.asset?.url,
      'asset.sha256': row.asset?.sha256,
    };
  }

  private async quarantine(row: CleanupRow, lastError: string) {
    const updated = await this.integrityFence.withIntegrityMutation((session) =>
      this.cleanupModel.findOneAndUpdate(
        this.rowFence(row),
        {
          $set: { reconciliation_required: true, last_error: lastError },
          $inc: { attempts: 1 },
          $unset: { worker_token: 1, lease_expires_at: 1 },
        },
        { returnDocument: 'after', session },
      ),
    );
    if (!updated) throw new Error('Cleanup quarantine fence was lost');
  }

  private async release(row: CleanupRow, lastError: string) {
    const updated = await this.integrityFence.withIntegrityMutation((session) =>
      this.cleanupModel.findOneAndUpdate(
        this.rowFence(row),
        {
          $set: { last_error: lastError },
          $inc: { attempts: 1 },
          $unset: { worker_token: 1, lease_expires_at: 1 },
        },
        { returnDocument: 'after', session },
      ),
    );
    if (!updated) throw new Error('Cleanup release fence was lost');
  }

  private async tryCleanup(row: CleanupRow) {
    const asset = commandOwnedAsset(row.asset);
    if (!asset) {
      const legacy = legacyAsset(row.asset?.url);
      await this.quarantine(
        row,
        legacy
          ? 'Legacy/unverified media is retained for explicit reconciliation; automatic deletion is forbidden'
          : 'Media cleanup journal is invalid; exact deletion was refused',
      );
      return false;
    }
    if (!(await this.originalOwnerIsProven(row, asset))) {
      await this.release(
        row,
        'The original media owner command and exact attempt could not be proven; automatic deletion was refused',
      );
      return false;
    }

    let deleteToken: string | undefined;
    await this.integrityFence.withIntegrityMutation(async (session) => {
      deleteToken = undefined;
      const current = await this.cleanupModel
        .findOne(this.rowFence(row))
        .session(session)
        .lean();
      if (!current) return;
      const claim = await this.registry.beginDeleteInSession(
        asset.url,
        session,
      );
      if (claim.claimed === false) {
        if (claim.reason === 'untracked') {
          await this.cleanupModel.findOneAndUpdate(
            this.rowFence(row),
            {
              $set: {
                reconciliation_required: true,
                last_error:
                  'Media registry ownership is untracked; automatic deletion is forbidden',
              },
              $inc: { attempts: 1 },
            },
            { session },
          );
        } else if (claim.reason === 'referenced') {
          await this.cleanupModel.findOneAndUpdate(
            this.rowFence(row),
            {
              $set: {
                last_error: `Media is still globally referenced (${claim.references.total}); automatic deletion was refused`,
              },
              $inc: { attempts: 1 },
            },
            { session },
          );
        }
        return;
      }
      const owned = await this.cleanupModel.findOneAndUpdate(
        this.rowFence(row),
        { $set: { worker_token: claim.delete_token }, $inc: { attempts: 1 } },
        { returnDocument: 'after', session },
      );
      if (!owned) throw new Error('Cleanup worker fence was lost');
      deleteToken = claim.delete_token;
    });
    if (!deleteToken) return false;

    try {
      await this.media.deleteCommandOwnedStrict(
        asset,
        this.folderFor(row, asset),
      );
      await this.integrityFence.withIntegrityMutation(async (session) => {
        const finalized = await this.registry.finalizeDeleted(
          asset.url,
          deleteToken!,
          session,
        );
        if (!finalized)
          throw new Error('Media registry finalize fence was lost');
        const completed = await this.cleanupModel.findOneAndUpdate(
          { ...this.rowFence(row), worker_token: deleteToken },
          {
            $set: {
              status: 'deleted',
              deleted_at: new Date(),
              reconciliation_required: false,
            },
            $unset: { worker_token: 1, lease_expires_at: 1, last_error: 1 },
          },
          { returnDocument: 'after', session },
        );
        if (!completed) throw new Error('Cleanup finalize fence was lost');
      });
      return true;
    } catch (error) {
      await this.integrityFence.withIntegrityMutation(async (session) => {
        const released = await this.registry.failDelete(
          asset.url,
          deleteToken!,
          error,
          session,
        );
        if (!released) throw new Error('Media registry failure fence was lost');
        const pending = await this.cleanupModel.findOneAndUpdate(
          { ...this.rowFence(row), worker_token: deleteToken },
          {
            $set: { last_error: errorMessage(error) },
            $unset: { worker_token: 1, lease_expires_at: 1 },
          },
          { returnDocument: 'after', session },
        );
        if (!pending) throw new Error('Cleanup failure fence was lost');
      });
      return false;
    }
  }

  private async originalOwnerIsProven(
    row: CleanupRow,
    asset: CommandOwnedStoredMediaAsset,
  ) {
    const allowedStatus =
      row.reason === 'precommit-failure'
        ? { $in: ['compensating', 'failed'] }
        : 'committed';
    const lifecycle = await this.lifecycleCommandModel
      .findOne({
        request_key: asset.owner_key,
        attempt_token: asset.owner_attempt_token,
        status: allowedStatus,
        'planned_asset.owner_key': asset.owner_key,
        'planned_asset.owner_attempt_token': asset.owner_attempt_token,
        'planned_asset.object_key': asset.object_key,
        'planned_asset.url': asset.url,
        'planned_asset.sha256': asset.sha256,
      } as never)
      .lean();
    if (lifecycle) return true;
    const mediaWrite = await this.writeCommandModel
      .findOne({
        status: allowedStatus,
        planned_assets: {
          $elemMatch: {
            'asset.owner_key': asset.owner_key,
            'asset.owner_attempt_token': asset.owner_attempt_token,
            'asset.object_key': asset.object_key,
            'asset.url': asset.url,
            'asset.sha256': asset.sha256,
          },
        },
      } as never)
      .lean();
    return Boolean(mediaWrite);
  }

  private folderFor(
    row: CleanupRow,
    asset: CommandOwnedStoredMediaAsset,
  ): MediaFolder {
    // #493 — the object key is ground truth: it IS the prefix the bytes were written
    // under. owner_type is only a heuristic, and since offers now own assets in TWO
    // folders (square logos in `brands`, wide heroes in `brand-banners`), resolving by
    // owner_type first would send banner cleanup at the wrong prefix and silently fail
    // to delete. Key checks therefore run BEFORE the owner_type fallback, which is
    // retained for legacy assets whose keys predate prefixing.
    const ownerType = row.owner_type ?? (row.category_id ? 'category' : null);
    if (asset.object_key.startsWith(`${MEDIA_FOLDER.BRAND_BANNERS}/`)) {
      return MEDIA_FOLDER.BRAND_BANNERS;
    }
    if (asset.object_key.startsWith(`${MEDIA_FOLDER.CATEGORIES}/`)) {
      return MEDIA_FOLDER.CATEGORIES;
    }
    if (asset.object_key.startsWith(`${MEDIA_FOLDER.BRANDS}/`)) {
      return MEDIA_FOLDER.BRANDS;
    }
    if (ownerType === 'category') return MEDIA_FOLDER.CATEGORIES;
    if (ownerType === 'offer') return MEDIA_FOLDER.BRANDS;
    throw new Error('Cleanup media folder could not be proven');
  }
}
