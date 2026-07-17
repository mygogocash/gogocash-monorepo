import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';

import { Category } from 'src/offer/schemas/category.schema';
import { Offer } from 'src/offer/schemas/offer.schema';

import { inspectPolicyTransactionCapability } from './policy-transaction-capability';
import {
  PolicyCategorySource,
  PolicyCategorySourceDocument,
} from './schemas/policy-category-source.schema';
import {
  PolicyIntegrityState,
  PolicyIntegrityStateDocument,
} from './schemas/policy-integrity-state.schema';
import {
  PolicyLifecycleCommand,
  PolicyLifecycleCommandDocument,
} from './schemas/policy-lifecycle-command.schema';
import {
  PolicyMediaAssetRegistry,
  PolicyMediaAssetRegistryDocument,
} from './schemas/policy-media-asset-registry.schema';
import {
  PolicyMediaCleanup,
  PolicyMediaCleanupDocument,
} from './schemas/policy-media-cleanup.schema';
import {
  PolicyMediaWriteCommand,
  PolicyMediaWriteCommandDocument,
} from './schemas/policy-media-write-command.schema';
import { Policy, PolicyDocument } from './schemas/policy.schema';

export const CATEGORY_INTEGRITY_STATE_KEY = 'category-integrity';
export const CATEGORY_INTEGRITY_MIGRATION_VERSION = 2;
const READINESS_CACHE_MS = 10_000;

function hasExactIndex(
  indexes: Array<Record<string, unknown>>,
  name: string,
  key: Record<string, number>,
  unique?: boolean,
  partialFilterExpression?: Record<string, unknown>,
) {
  const index = indexes.find((candidate) => candidate.name === name);
  if (!index || JSON.stringify(index.key) !== JSON.stringify(key)) return false;
  const actualPartial = index.partialFilterExpression;
  if (
    partialFilterExpression === undefined
      ? actualPartial !== undefined
      : JSON.stringify(actualPartial) !==
        JSON.stringify(partialFilterExpression)
  ) {
    return false;
  }
  return (
    unique === undefined ||
    index.unique === unique ||
    (unique === false && index.unique === undefined)
  );
}

export function policyIntegrityReadinessError(
  reason: string,
  missing: string[] = [],
) {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
    message:
      'Policy category mutations are unavailable until the integrity migration is complete.',
    reason,
    ...(missing.length ? { missing } : {}),
  });
}

/**
 * Shared readiness check and transaction latch for every policy-integrity
 * mutation. It deliberately knows only persistence topology and schemas.
 */
@Injectable()
export class PolicyIntegrityFenceService {
  private readinessCache:
    | { checkedAt: number; ready: true }
    | { checkedAt: number; ready: false; error: ServiceUnavailableException };

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(PolicyCategorySource.name)
    private readonly sourceModel: Model<PolicyCategorySourceDocument>,
    @InjectModel(PolicyIntegrityState.name)
    private readonly stateModel: Model<PolicyIntegrityStateDocument>,
    @InjectModel(PolicyLifecycleCommand.name)
    private readonly commandModel: Model<PolicyLifecycleCommandDocument>,
    @InjectModel(PolicyMediaWriteCommand.name)
    private readonly writeCommandModel: Model<PolicyMediaWriteCommandDocument>,
    @InjectModel(PolicyMediaCleanup.name)
    private readonly cleanupModel: Model<PolicyMediaCleanupDocument>,
    @InjectModel(PolicyMediaAssetRegistry.name)
    private readonly registryModel: Model<PolicyMediaAssetRegistryDocument>,
  ) {}

  async assertReady(force = false): Promise<void> {
    const now = Date.now();
    if (
      !force &&
      this.readinessCache &&
      now - this.readinessCache.checkedAt < READINESS_CACHE_MS
    ) {
      if (this.readinessCache.ready) return;
      if ('error' in this.readinessCache) throw this.readinessCache.error;
    }

    const capability = await inspectPolicyTransactionCapability(
      this.connection,
    );
    if (!capability.supported) {
      const error = policyIntegrityReadinessError(
        capability.reason ?? 'MongoDB transaction support is unavailable',
      );
      this.readinessCache = { checkedAt: now, ready: false, error };
      throw error;
    }
    const marker = await this.stateModel
      .findOne({
        key: CATEGORY_INTEGRITY_STATE_KEY,
        status: 'ready',
        migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
      })
      .lean();
    if (!marker) {
      const error = policyIntegrityReadinessError(
        'Durable migration marker is absent or stale',
      );
      this.readinessCache = { checkedAt: now, ready: false, error };
      throw error;
    }

    let inventories: Array<Array<Record<string, unknown>>>;
    try {
      inventories = (await Promise.all([
        this.categoryModel.collection.indexes(),
        this.offerModel.collection.indexes(),
        this.sourceModel.collection.indexes(),
        this.stateModel.collection.indexes(),
        this.policyModel.collection.indexes(),
        this.commandModel.collection.indexes(),
        this.writeCommandModel.collection.indexes(),
        this.cleanupModel.collection.indexes(),
        this.registryModel.collection.indexes(),
      ])) as Array<Array<Record<string, unknown>>>;
    } catch {
      const error = policyIntegrityReadinessError(
        'Required index inventory failed',
      );
      this.readinessCache = { checkedAt: now, ready: false, error };
      throw error;
    }
    const [
      categoryIndexes,
      offerIndexes,
      sourceIndexes,
      stateIndexes,
      policyIndexes,
      commandIndexes,
      writeCommandIndexes,
      cleanupIndexes,
      registryIndexes,
    ] = inventories;
    const missing: string[] = [];
    if (
      !hasExactIndex(
        categoryIndexes,
        'policy_category_name_normalized_v2',
        { name_normalized: 1 },
        true,
        { name_normalized: { $type: 'string' } },
      )
    )
      missing.push('categories.policy_category_name_normalized_v2');
    if (
      !hasExactIndex(
        offerIndexes,
        'policy_category_id_1',
        { policy_category_id: 1 },
        false,
      )
    )
      missing.push('offers.policy_category_id_1');
    if (
      !hasExactIndex(
        offerIndexes,
        'categories_normalized_1',
        { categories_normalized: 1 },
        false,
      )
    )
      missing.push('offers.categories_normalized_1');
    if (
      !hasExactIndex(
        sourceIndexes,
        'policy_category_source_identity_v2',
        { source: 1, source_key: 1 },
        true,
      )
    )
      missing.push(
        'policy_category_sources.policy_category_source_identity_v2',
      );
    if (
      !hasExactIndex(
        sourceIndexes,
        'policy_category_source_category_id_v2',
        { category_id: 1 },
        false,
      )
    )
      missing.push(
        'policy_category_sources.policy_category_source_category_id_v2',
      );
    if (
      sourceIndexes.some(
        (index) =>
          index.unique === true &&
          JSON.stringify(index.key) === JSON.stringify({ category_id: 1 }),
      )
    )
      missing.push('drop-obsolete-unique-source-category-id');
    if (
      !hasExactIndex(
        stateIndexes,
        'policy_integrity_state_key_v2',
        { key: 1 },
        true,
      )
    )
      missing.push('policy_integrity_states.policy_integrity_state_key_v2');
    if (
      !hasExactIndex(policyIndexes, 'category_id_1', { category_id: 1 }, true)
    )
      missing.push('policies.category_id_1');
    if (
      !hasExactIndex(commandIndexes, 'request_key_1', { request_key: 1 }, true)
    )
      missing.push('policy_lifecycle_commands.request_key_1');
    if (
      !hasExactIndex(
        writeCommandIndexes,
        'request_key_1',
        { request_key: 1 },
        true,
      )
    )
      missing.push('policy_media_write_commands.request_key_1');
    if (
      !hasExactIndex(
        writeCommandIndexes,
        'planned_asset_owner_1_attempt_1_object_1',
        {
          'planned_assets.asset.owner_key': 1,
          'planned_assets.asset.owner_attempt_token': 1,
          'planned_assets.asset.object_key': 1,
        },
        false,
        { 'planned_assets.asset.object_key': { $type: 'string' } },
      )
    )
      missing.push(
        'policy_media_write_commands.planned_asset_owner_1_attempt_1_object_1',
      );
    if (
      !hasExactIndex(
        cleanupIndexes,
        'request_key_1_payload_hash_1_attempt_token_1_reason_1_asset.object_key_1',
        {
          request_key: 1,
          payload_hash: 1,
          attempt_token: 1,
          reason: 1,
          'asset.object_key': 1,
        },
        true,
        { 'asset.object_key': { $type: 'string' } },
      )
    )
      missing.push('policy_media_cleanup.owner_asset_unique');
    if (
      !hasExactIndex(
        registryIndexes,
        'policy_media_asset_registry_url_hash_v1',
        { url_hash: 1 },
        true,
      )
    )
      missing.push(
        'policy_media_asset_registry.policy_media_asset_registry_url_hash_v1',
      );
    if (
      !hasExactIndex(
        registryIndexes,
        'policy_media_asset_registry_state_lease_v1',
        { state: 1, delete_lease_expires_at: 1 },
        false,
      )
    )
      missing.push(
        'policy_media_asset_registry.policy_media_asset_registry_state_lease_v1',
      );
    if (missing.length) {
      const error = policyIntegrityReadinessError(
        'Required exact indexes are incomplete',
        missing,
      );
      this.readinessCache = { checkedAt: now, ready: false, error };
      throw error;
    }
    this.readinessCache = { checkedAt: now, ready: true };
  }

  async fenceReady(session: ClientSession): Promise<void> {
    const marker = await this.stateModel
      .findOneAndUpdate(
        {
          key: CATEGORY_INTEGRITY_STATE_KEY,
          status: 'ready',
          migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
        },
        { $inc: { write_epoch: 1 } },
        { returnDocument: 'after', session },
      )
      .lean();
    if (!marker) {
      throw policyIntegrityReadinessError(
        'Migration marker changed during the mutation',
      );
    }
  }

  async withIntegrityMutation<T>(
    writer: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    await this.assertReady();
    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        result = await writer(session);
      });
    } finally {
      await session.endSession();
    }
    return result as T;
  }
}
