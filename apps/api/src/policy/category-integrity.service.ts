import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import {
  mongoEq,
  requireFiniteNumber,
  requireObjectId,
  requireTrimmedString,
} from 'src/common/mongo-query';
import {
  Category,
  CategoryMediaAsset,
} from 'src/offer/schemas/category.schema';
import { Offer } from 'src/offer/schemas/offer.schema';

import { CategoryLifecycleCommandDto } from './dto/category-lifecycle-command.dto';
import { PolicyMediaCleanupService } from './policy-media-cleanup.service';
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
import { PolicyMediaAssetRegistryService } from './policy-media-asset-registry.service';
import { Policy, PolicyDocument } from './schemas/policy.schema';
import {
  CATEGORY_INTEGRITY_MIGRATION_VERSION,
  CATEGORY_INTEGRITY_STATE_KEY,
  PolicyIntegrityFenceService,
  policyIntegrityReadinessError,
} from './policy-integrity-fence.service';

export { CATEGORY_INTEGRITY_MIGRATION_VERSION } from './policy-integrity-fence.service';
const CATEGORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export type CategoryReferenceCounts = {
  offer_policy_category_id: number;
  offer_categories_normalized: number;
  unique_offers: number;
};

export type CategoryAssignment = {
  policy_category_id?: string;
  /** Explicit mutation intent; writers must translate this into `$unset`. */
  unset_policy_category_id?: true;
  categories_normalized: string | null;
};

type RawCategoryLoader = (session: ClientSession) => Promise<unknown>;

type LifecycleOperation = 'delete-content' | 'retire' | 'purge';
type LifecycleResponse = Record<string, unknown> & {
  request_key: string;
  operation: LifecycleOperation;
};

type CommandOwnedAsset = CategoryMediaAsset & {
  provider: 'r2';
  ownership: 'command-owned';
  owner_key: string;
  owner_attempt_token: string;
  bucket: string;
  object_key: string;
  sha256: string;
  original_name: string;
};

export function normalizeCategoryIdentity(
  value: unknown,
): { display: string; normalized: string } | null {
  if (typeof value !== 'string') return null;
  const display = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!display) return null;
  return {
    display,
    normalized: display.toLocaleLowerCase('en-US'),
  };
}

function commandOwnedAsset(value: unknown): CommandOwnedAsset | null {
  if (!value || typeof value !== 'object') return null;
  const asset = value as Partial<CommandOwnedAsset>;
  if (
    asset.provider !== 'r2' ||
    asset.ownership !== 'command-owned' ||
    typeof asset.owner_key !== 'string' ||
    !asset.owner_key ||
    typeof asset.owner_attempt_token !== 'string' ||
    !asset.owner_attempt_token ||
    typeof asset.url !== 'string' ||
    typeof asset.bucket !== 'string' ||
    typeof asset.object_key !== 'string' ||
    typeof asset.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(asset.sha256) ||
    typeof asset.original_name !== 'string'
  ) {
    return null;
  }
  return asset as CommandOwnedAsset;
}

function plain(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const maybeDocument = value as {
    toObject?: () => Record<string, unknown>;
  };
  return maybeDocument.toObject
    ? maybeDocument.toObject()
    : { ...(value as Record<string, unknown>) };
}

function serializedCategory(value: unknown): Record<string, unknown> {
  const category = plain(value);
  return {
    _id: String(category._id),
    name: category.name,
    name_normalized: category.name_normalized,
    lifecycle_status: category.lifecycle_status,
    revision: category.revision,
    ...(category.icon_key ? { icon_key: category.icon_key } : {}),
    ...(category.retired_at ? { retired_at: category.retired_at } : {}),
    ...(category.purge_after ? { purge_after: category.purge_after } : {}),
  };
}

function payloadHash(
  operation: LifecycleOperation,
  categoryId: Types.ObjectId,
  expectedRevision: number,
) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        operation,
        category_id: String(categoryId),
        expected_revision: expectedRevision,
      }),
    )
    .digest('hex');
}

const readinessError = policyIntegrityReadinessError;

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000,
  );
}

@Injectable()
export class CategoryIntegrityService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(PolicyCategorySource.name)
    private readonly sourceModel: Model<PolicyCategorySourceDocument>,
    @InjectModel(PolicyIntegrityState.name)
    private readonly stateModel: Model<PolicyIntegrityStateDocument>,
    @InjectModel(PolicyLifecycleCommand.name)
    private readonly commandModel: Model<PolicyLifecycleCommandDocument>,
    private readonly mediaCleanup: PolicyMediaCleanupService,
    private readonly mediaRegistry: PolicyMediaAssetRegistryService,
    private readonly integrityFence: PolicyIntegrityFenceService,
  ) {}

  /**
   * Route an existing normal write across the one-way activation boundary.
   *
   * Absence is deliberately read from primary for every invocation and is never
   * cached: once migration acquisition creates the state row, legacy behavior
   * must not be selected again. The maintenance runbook still drains every old
   * binary because a standalone MongoDB cannot atomically fence its writes to
   * other collections against creation of this row.
   */
  async withNormalWrite<T>(branches: {
    legacy: () => Promise<T>;
    enforced: () => Promise<T>;
  }): Promise<T> {
    const marker = await this.stateModel
      .findOne({ key: CATEGORY_INTEGRITY_STATE_KEY })
      .read('primary')
      .lean();
    if (!marker) return branches.legacy();
    if (
      marker.status !== 'ready' ||
      marker.migration_version !== CATEGORY_INTEGRITY_MIGRATION_VERSION
    ) {
      throw readinessError(
        'The durable activation latch exists but is not ready for v2 writers',
      );
    }
    await this.assertReady(true);
    return branches.enforced();
  }

  async assertReady(force = false): Promise<void> {
    return this.integrityFence.assertReady(force);
  }

  /**
   * Serialize every integrity-sensitive write with migration acquisition.
   * Updating the durable marker in the caller's transaction creates a real
   * write conflict; a read-only snapshot check would still allow overlap.
   */
  async fenceReady(session: ClientSession): Promise<void> {
    return this.integrityFence.fenceReady(session);
  }

  async referenceCounts(
    categoryId: Types.ObjectId,
    session?: ClientSession,
    normalizedOverride?: string,
  ): Promise<CategoryReferenceCounts> {
    let normalized = normalizedOverride;
    if (!normalized) {
      let categoryQuery = this.categoryModel.findOne(
        { _id: categoryId },
        { name_normalized: 1, name: 1 },
      );
      if (session) categoryQuery = categoryQuery.session(session);
      const category = await categoryQuery.lean();
      const identity = normalizeCategoryIdentity(
        category?.name_normalized ?? category?.name,
      );
      normalized = identity?.normalized;
    }

    let sourceKeyQuery = this.sourceModel.distinct('source_key', {
      category_id: categoryId,
    });
    if (session) sourceKeyQuery = sourceKeyQuery.session(session);
    const sourceKeys = await sourceKeyQuery.exec();
    const normalizedKeys = [normalized, ...sourceKeys]
      .map((value) => normalizeCategoryIdentity(value)?.normalized)
      .filter((value): value is string => Boolean(value));
    const uniqueNormalizedKeys = [...new Set(normalizedKeys)];

    let directQuery = this.offerModel.distinct('_id', {
      policy_category_id: String(categoryId),
    });
    let normalizedQuery = this.offerModel.distinct('_id', {
      categories_normalized: {
        $in:
          uniqueNormalizedKeys.length > 0
            ? uniqueNormalizedKeys
            : ['__missing-category-identity__'],
      },
    });
    if (session) {
      directQuery = directQuery.session(session);
      normalizedQuery = normalizedQuery.session(session);
    }
    // MongoDB transactions do not support parallel operations on one session.
    // Keep these exact-count scans sequential when a lifecycle transaction owns
    // the session; the same ordering is harmless for the read-only call path.
    const direct = await directQuery.exec();
    const legacy = await normalizedQuery.exec();
    const unique = new Set(
      [...direct, ...legacy].map((offerId) => String(offerId)),
    );
    return {
      offer_policy_category_id: direct.length,
      offer_categories_normalized: legacy.length,
      unique_offers: unique.size,
    };
  }

  async createLegacyCategory(nameValue: unknown) {
    const legacyDisplay = typeof nameValue === 'string' ? nameValue.trim() : '';
    if (!legacyDisplay) throw new BadRequestException('name is required');
    const identity = normalizeCategoryIdentity(nameValue);
    if (!identity) throw new BadRequestException('name is required');
    return this.withNormalWrite({
      legacy: async () => {
        try {
          return await this.categoryModel.create({ name: legacyDisplay });
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 11000
          ) {
            throw new BadRequestException(
              `A category named "${legacyDisplay}" already exists.`,
            );
          }
          throw error;
        }
      },
      enforced: () => this.createCategoryWithIntegrity(identity),
    });
  }

  private async createCategoryWithIntegrity(identity: {
    display: string;
    normalized: string;
  }) {
    const session = await this.connection.startSession();
    let result: unknown;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        const existingCategory = await this.categoryModel
          .findOne({ name_normalized: identity.normalized })
          .session(session)
          .lean();
        const reservedIdentity = await this.sourceModel
          .findOne({ source_key: identity.normalized })
          .session(session)
          .lean();
        if (existingCategory || reservedIdentity) {
          throw new ConflictException(
            `A category named "${identity.display}" already exists or is reserved.`,
          );
        }
        const categoryId = new Types.ObjectId();
        const created = await this.categoryModel.create(
          [
            {
              _id: categoryId,
              name: identity.display,
              name_normalized: identity.normalized,
              lifecycle_status: 'active',
              revision: 1,
            },
          ],
          { session },
        );
        await this.sourceModel.findOneAndUpdate(
          { source: 'legacy', source_key: identity.normalized },
          {
            $setOnInsert: {
              category_id: categoryId,
              source: 'legacy',
              source_key: identity.normalized,
              request_key: `legacy-category:${randomUUID()}`,
              active: true,
              tombstoned: false,
              revision: 1,
            },
          },
          { upsert: true, returnDocument: 'after', session },
        );
        result = created[0];
      });
    } finally {
      await session.endSession();
    }
    return result;
  }

  async updateLegacyCategoryMetadata(
    categoryIdValue: string,
    update: { name?: string; image?: string; banner?: string },
  ) {
    if (!Types.ObjectId.isValid(categoryIdValue)) {
      throw new BadRequestException('Invalid category id');
    }
    const identity =
      update.name === undefined ? null : normalizeCategoryIdentity(update.name);
    if (update.name !== undefined && !identity) {
      throw new BadRequestException('name is required');
    }
    await this.assertReady();
    const categoryId = new Types.ObjectId(categoryIdValue);
    const cleanupRequestKey = `legacy-category-media:${categoryId}:v1`;
    const cleanupAttemptToken = cleanupRequestKey;
    const session = await this.connection.startSession();
    let result: unknown;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        const current = await this.categoryModel
          .findOne({ _id: categoryId, lifecycle_status: 'active' })
          .session(session)
          .lean();
        if (!current)
          throw new NotFoundException('Category not found or inactive');
        if (identity) {
          const duplicate = await this.categoryModel
            .findOne({
              _id: { $ne: categoryId },
              name_normalized: identity.normalized,
            })
            .session(session)
            .lean();
          const tombstone = await this.sourceModel
            .findOne({
              source_key: identity.normalized,
              tombstoned: true,
            })
            .session(session)
            .lean();
          const inactive = await this.sourceModel
            .findOne({
              source_key: identity.normalized,
              active: false,
            })
            .session(session)
            .lean();
          const reservedByAnotherCategory = await this.sourceModel
            .findOne({
              source_key: identity.normalized,
              category_id: { $ne: categoryId },
            })
            .session(session)
            .lean();
          if (duplicate || tombstone || inactive || reservedByAnotherCategory) {
            throw new ConflictException(
              `A category named "${identity.display}" already exists or is reserved.`,
            );
          }
        }
        const set: Record<string, unknown> = {};
        const unset: Record<string, 1> = {};
        if (identity) {
          set.name = identity.display;
          set.name_normalized = identity.normalized;
        }
        if (update.image !== undefined) {
          set.image = update.image;
          unset.image_asset = 1;
        }
        if (update.banner !== undefined) {
          set.banner = update.banner;
          unset.banner_asset = 1;
        }
        for (const url of new Set(
          [update.image, update.banner].filter(
            (value): value is string =>
              typeof value === 'string' && Boolean(value.trim()),
          ),
        )) {
          await this.mediaRegistry.touchAttachInSession(url, session);
        }
        const currentImageAsset = plain(current.image_asset);
        const currentBannerAsset = plain(current.banner_asset);
        const currentImageAssetUrl = currentImageAsset.url;
        const currentBannerAssetUrl = currentBannerAsset.url;
        const replacedReferences = [
          ...(update.image !== undefined &&
          typeof current.image === 'string' &&
          current.image &&
          current.image !== update.image
            ? [current.image]
            : []),
          ...(update.image !== undefined &&
          typeof currentImageAssetUrl === 'string' &&
          currentImageAssetUrl &&
          currentImageAssetUrl !== update.image
            ? [currentImageAsset]
            : []),
          ...(update.banner !== undefined &&
          typeof current.banner === 'string' &&
          current.banner &&
          current.banner !== update.banner
            ? [current.banner]
            : []),
          ...(update.banner !== undefined &&
          typeof currentBannerAssetUrl === 'string' &&
          currentBannerAssetUrl &&
          currentBannerAssetUrl !== update.banner
            ? [currentBannerAsset]
            : []),
        ];
        result = await this.categoryModel
          .findOneAndUpdate(
            {
              _id: categoryId,
              lifecycle_status: 'active',
              revision: current.revision,
            },
            {
              $set: set,
              ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
              $inc: { revision: 1 },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!result) this.revisionConflict();
        if (replacedReferences.length > 0) {
          const journal = await this.mediaCleanup.journalLegacyReplacements(
            {
              owner_type: 'category',
              owner_id: categoryId,
              request_key: cleanupRequestKey,
              attempt_token: cleanupAttemptToken,
              reason: 'legacy-category-replaced',
              references: replacedReferences,
            },
            session,
          );
          if (journal.length === 0) {
            throw new Error('Category media cleanup journal was not persisted');
          }
        }
        if (identity) {
          await this.sourceModel.findOneAndUpdate(
            { source: 'legacy', source_key: identity.normalized },
            {
              $setOnInsert: {
                category_id: categoryId,
                source: 'legacy',
                source_key: identity.normalized,
                request_key: `legacy-category-rename:${randomUUID()}`,
                active: true,
                tombstoned: false,
                revision: 1,
              },
            },
            { upsert: true, returnDocument: 'after', session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
    let cleanupResult: { deleted: number; pending: number };
    try {
      cleanupResult = await this.mediaCleanup.processRequest(cleanupRequestKey);
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'POLICY_MEDIA_CLEANUP_PENDING',
        message: `Category metadata committed, but media cleanup is pending. Retry with key ${cleanupRequestKey}.`,
        request_key: cleanupRequestKey,
      });
    }
    if (cleanupResult.pending > 0) {
      return {
        ...plain(result),
        media_cleanup_pending: true,
        media_cleanup_request_key: cleanupRequestKey,
      };
    }
    return result;
  }

  /**
   * Reserve a normalized legacy alias inside a caller-owned transaction.
   * The caller must merge the returned fields into its single category CAS;
   * the alias reservation rolls back automatically if that CAS loses.
   */
  async reserveLegacyCategoryRenameInSession(
    categoryIdValue: string,
    nameValue: unknown,
    session: ClientSession,
  ): Promise<{ name: string; name_normalized: string }> {
    if (!Types.ObjectId.isValid(categoryIdValue)) {
      throw new BadRequestException('Invalid category id');
    }
    const identity = normalizeCategoryIdentity(nameValue);
    if (!identity) throw new BadRequestException('name is required');
    const categoryId = new Types.ObjectId(categoryIdValue);
    const duplicate = await this.categoryModel
      .findOne({
        _id: { $ne: categoryId },
        name_normalized: identity.normalized,
      })
      .session(session)
      .lean();
    const tombstone = await this.sourceModel
      .findOne({ source_key: identity.normalized, tombstoned: true })
      .session(session)
      .lean();
    const inactive = await this.sourceModel
      .findOne({ source_key: identity.normalized, active: false })
      .session(session)
      .lean();
    const reservedByAnotherCategory = await this.sourceModel
      .findOne({
        source_key: identity.normalized,
        category_id: { $ne: categoryId },
      })
      .session(session)
      .lean();
    if (duplicate || tombstone || inactive || reservedByAnotherCategory) {
      throw new ConflictException(
        `A category named "${identity.display}" already exists or is reserved.`,
      );
    }

    await this.sourceModel.findOneAndUpdate(
      { source: 'legacy', source_key: identity.normalized },
      {
        $setOnInsert: {
          category_id: categoryId,
          source: 'legacy',
          source_key: identity.normalized,
          request_key: `legacy-category-rename:${randomUUID()}`,
          active: true,
          tombstoned: false,
          revision: 1,
        },
      },
      { upsert: true, returnDocument: 'after', session },
    );
    return {
      name: identity.display,
      name_normalized: identity.normalized,
    };
  }

  async withPolicyCategoryAssignment<T>(
    policyCategoryId: unknown,
    rawCategory: unknown | RawCategoryLoader,
    writer: (
      assignment: CategoryAssignment,
      session?: ClientSession,
    ) => Promise<T>,
  ): Promise<T> {
    const rawCategoryLoader =
      typeof rawCategory === 'function'
        ? (rawCategory as RawCategoryLoader)
        : undefined;
    const staticRawIdentity = rawCategoryLoader
      ? null
      : normalizeCategoryIdentity(rawCategory);
    const raw =
      typeof policyCategoryId === 'string' ? policyCategoryId.trim() : '';
    const isMapped = Boolean(raw && raw !== 'custom');
    if (!isMapped && !rawCategoryLoader && !staticRawIdentity) {
      return writer(
        {
          ...(raw === 'custom' ? { policy_category_id: 'custom' } : {}),
          categories_normalized: null,
        },
        undefined,
      );
    }
    if (isMapped && !Types.ObjectId.isValid(raw)) {
      throw new BadRequestException('policy_category_id is invalid');
    }
    await this.assertReady();
    const categoryId = isMapped ? new Types.ObjectId(raw) : undefined;
    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        const currentRawCategory = rawCategoryLoader
          ? await rawCategoryLoader(session)
          : rawCategory;
        const rawIdentity = normalizeCategoryIdentity(currentRawCategory);
        let mappedCategory: Record<string, unknown> | null = null;
        if (categoryId) {
          mappedCategory = (await this.categoryModel
            .findOneAndUpdate(
              {
                _id: categoryId,
                lifecycle_status: 'active',
                revision: { $gte: 1 },
              },
              { $inc: { revision: 1 } },
              { returnDocument: 'after', session },
            )
            .lean()) as unknown as Record<string, unknown> | null;
          if (!mappedCategory) {
            throw new ConflictException({
              statusCode: 409,
              code: 'POLICY_CATEGORY_INACTIVE',
              message:
                'Policy category is inactive; refresh and choose another.',
            });
          }
        }

        let categoriesNormalized: string | null = null;
        if (rawIdentity) {
          const tombstone = await this.sourceModel
            .findOne({
              source_key: rawIdentity.normalized,
              tombstoned: true,
            })
            .session(session)
            .lean();
          if (!tombstone) {
            const mappedIdentity = normalizeCategoryIdentity(
              mappedCategory?.name_normalized ?? mappedCategory?.name,
            )?.normalized;
            const retainedAlias = await this.sourceModel
              .findOne({
                source_key: rawIdentity.normalized,
                active: true,
                tombstoned: false,
              })
              .session(session)
              .lean();
            const retainedCategoryId = retainedAlias?.category_id
              ? String(retainedAlias.category_id)
              : undefined;
            if (
              mappedCategory &&
              (mappedIdentity === rawIdentity.normalized ||
                retainedCategoryId === String(categoryId))
            ) {
              categoriesNormalized = rawIdentity.normalized;
            } else {
              const rawCategory = await this.categoryModel
                .findOneAndUpdate(
                  {
                    ...(retainedAlias
                      ? { _id: retainedAlias.category_id }
                      : { name_normalized: rawIdentity.normalized }),
                    lifecycle_status: 'active',
                    revision: { $gte: 1 },
                  },
                  { $inc: { revision: 1 } },
                  { returnDocument: 'after', session },
                )
                .lean();
              if (rawCategory) categoriesNormalized = rawIdentity.normalized;
            }
          }
        }
        result = await writer(
          {
            ...(categoryId
              ? { policy_category_id: String(categoryId) }
              : raw === 'custom'
                ? { policy_category_id: 'custom' }
                : rawCategoryLoader
                  ? { unset_policy_category_id: true as const }
                  : {}),
            categories_normalized: categoriesNormalized,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    return result as T;
  }

  async withIntegrityMutation<T>(
    writer: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    return this.integrityFence.withIntegrityMutation(writer);
  }

  /**
   * Resolve and fence a policy-category assignment inside a transaction owned
   * by another integrity service (for example the durable media writer).
   * The caller must have already called `fenceReady(session)`.
   */
  async policyCategoryAssignmentInSession(
    policyCategoryId: unknown,
    rawCategory: unknown,
    session: ClientSession,
  ): Promise<CategoryAssignment> {
    const raw =
      typeof policyCategoryId === 'string' ? policyCategoryId.trim() : '';
    const isMapped = Boolean(raw && raw !== 'custom');
    if (isMapped && !Types.ObjectId.isValid(raw)) {
      throw new BadRequestException('policy_category_id is invalid');
    }
    const categoryId = isMapped ? new Types.ObjectId(raw) : undefined;
    const rawIdentity = normalizeCategoryIdentity(rawCategory);
    let mappedCategory: Record<string, unknown> | null = null;
    if (categoryId) {
      mappedCategory = (await this.categoryModel
        .findOneAndUpdate(
          {
            _id: categoryId,
            lifecycle_status: 'active',
            revision: { $gte: 1 },
          },
          { $inc: { revision: 1 } },
          { returnDocument: 'after', session },
        )
        .lean()) as unknown as Record<string, unknown> | null;
      if (!mappedCategory) {
        throw new ConflictException({
          statusCode: 409,
          code: 'POLICY_CATEGORY_INACTIVE',
          message: 'Policy category is inactive; refresh and choose another.',
        });
      }
    }

    let categoriesNormalized: string | null = null;
    if (rawIdentity) {
      const tombstone = await this.sourceModel
        .findOne({ source_key: rawIdentity.normalized, tombstoned: true })
        .session(session)
        .lean();
      if (!tombstone) {
        const mappedIdentity = normalizeCategoryIdentity(
          mappedCategory?.name_normalized ?? mappedCategory?.name,
        )?.normalized;
        const retainedAlias = await this.sourceModel
          .findOne({
            source_key: rawIdentity.normalized,
            active: true,
            tombstoned: false,
          })
          .session(session)
          .lean();
        const retainedCategoryId = retainedAlias?.category_id
          ? String(retainedAlias.category_id)
          : undefined;
        if (
          mappedCategory &&
          (mappedIdentity === rawIdentity.normalized ||
            retainedCategoryId === String(categoryId))
        ) {
          categoriesNormalized = rawIdentity.normalized;
        } else {
          const currentRawCategory = await this.categoryModel
            .findOneAndUpdate(
              {
                ...(retainedAlias
                  ? { _id: retainedAlias.category_id }
                  : { name_normalized: rawIdentity.normalized }),
                lifecycle_status: 'active',
                revision: { $gte: 1 },
              },
              { $inc: { revision: 1 } },
              { returnDocument: 'after', session },
            )
            .lean();
          if (currentRawCategory) categoriesNormalized = rawIdentity.normalized;
        }
      }
    }
    return {
      ...(categoryId
        ? { policy_category_id: String(categoryId) }
        : raw === 'custom'
          ? { policy_category_id: 'custom' }
          : {}),
      categories_normalized: categoriesNormalized,
    };
  }

  async withPolicyContentMutation<T>(
    categoryIdValue: string,
    writer: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    if (!Types.ObjectId.isValid(categoryIdValue)) {
      throw new BadRequestException('Invalid category id');
    }
    await this.assertReady();
    const categoryId = new Types.ObjectId(categoryIdValue);
    const current = await this.categoryModel
      .findOne({ _id: categoryId, lifecycle_status: 'active' })
      .lean();
    if (!current) throw new NotFoundException('Category not found or inactive');
    const expectedRevision = Number(current.revision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
      throw readinessError('Category revision backfill is incomplete');
    }

    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        const fenced = await this.categoryModel
          .findOneAndUpdate(
            {
              _id: categoryId,
              lifecycle_status: 'active',
              revision: expectedRevision,
            },
            { $inc: { revision: 1 } },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!fenced) this.revisionConflict();
        result = await writer(session);
      });
    } finally {
      await session.endSession();
    }
    return result as T;
  }

  async assertPolicyCategoryAssignmentReady(
    policyCategoryId: unknown,
  ): Promise<void> {
    const raw =
      typeof policyCategoryId === 'string' ? policyCategoryId.trim() : '';
    if (!raw || raw === 'custom') return;
    if (!Types.ObjectId.isValid(raw)) {
      throw new BadRequestException('policy_category_id is invalid');
    }
    await this.assertReady();
  }

  async withInvolveCategoryAssignment<T>(
    rawCategory: unknown,
    writer: (
      assignment: CategoryAssignment,
      session?: ClientSession,
    ) => Promise<T>,
  ): Promise<T> {
    const identity = normalizeCategoryIdentity(rawCategory);
    if (!identity) {
      return this.withIntegrityMutation((session) =>
        writer({ categories_normalized: null }, session),
      );
    }
    await this.assertReady();
    const session = await this.connection.startSession();
    let result: T | undefined;
    try {
      await session.withTransaction(async () => {
        result = undefined;
        await this.fenceReady(session);
        const globalTombstone = await this.sourceModel
          .findOne({
            source_key: identity.normalized,
            tombstoned: true,
          })
          .session(session)
          .lean();
        if (globalTombstone) {
          result = await writer({ categories_normalized: null }, session);
          return;
        }
        let sourceQuery = this.sourceModel.findOne({
          source_key: identity.normalized,
          active: true,
          tombstoned: false,
        });
        sourceQuery = sourceQuery.session(session);
        const alias = await sourceQuery.lean();

        if (alias) {
          const category = await this.categoryModel
            .findOneAndUpdate(
              {
                _id: alias.category_id,
                lifecycle_status: 'active',
                revision: { $gte: 1 },
              },
              { $inc: { revision: 1 } },
              { returnDocument: 'after', session },
            )
            .lean();
          if (!category) {
            await this.sourceModel.updateMany(
              { category_id: alias.category_id },
              {
                $set: {
                  active: false,
                  tombstoned: true,
                  retired_at: new Date(),
                },
                $inc: { revision: 1 },
              },
              { session },
            );
            result = await writer({ categories_normalized: null }, session);
            return;
          }
          result = await writer(
            { categories_normalized: identity.normalized },
            session,
          );
          return;
        }

        const existingCategory = await this.categoryModel
          .findOne({ name_normalized: identity.normalized })
          .session(session)
          .lean();
        if (
          existingCategory &&
          existingCategory.lifecycle_status !== 'active'
        ) {
          await this.sourceModel.findOneAndUpdate(
            { source: 'involve', source_key: identity.normalized },
            {
              $setOnInsert: {
                category_id: existingCategory._id,
                source: 'involve',
                source_key: identity.normalized,
                request_key: `involve-tombstone:${identity.normalized}`,
                active: false,
                tombstoned: true,
                revision: 1,
                retired_at: new Date(),
              },
            },
            { upsert: true, returnDocument: 'after', session },
          );
          result = await writer({ categories_normalized: null }, session);
          return;
        }

        let categoryId: Types.ObjectId;
        if (existingCategory) {
          categoryId = existingCategory._id as Types.ObjectId;
          const touched = await this.categoryModel
            .findOneAndUpdate(
              {
                _id: categoryId,
                lifecycle_status: 'active',
                revision: { $gte: 1 },
              },
              { $inc: { revision: 1 } },
              { returnDocument: 'after', session },
            )
            .lean();
          if (!touched) {
            throw new ConflictException(
              'Involve category changed concurrently; retry the sync.',
            );
          }
        } else {
          categoryId = new Types.ObjectId();
          await this.categoryModel.create(
            [
              {
                _id: categoryId,
                name: identity.display,
                name_normalized: identity.normalized,
                lifecycle_status: 'active',
                revision: 1,
              },
            ],
            { session },
          );
        }
        await this.sourceModel.findOneAndUpdate(
          { source: 'involve', source_key: identity.normalized },
          {
            $setOnInsert: {
              category_id: categoryId,
              source: 'involve',
              source_key: identity.normalized,
              request_key: `involve:${identity.normalized}`,
              active: true,
              tombstoned: false,
              revision: 1,
            },
          },
          { upsert: true, returnDocument: 'after', session },
        );
        result = await writer(
          { categories_normalized: identity.normalized },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
    return result as T;
  }

  async deleteContent(
    categoryIdValue: string,
    dto: CategoryLifecycleCommandDto,
  ): Promise<LifecycleResponse> {
    return this.executeLifecycle(
      categoryIdValue,
      dto,
      'delete-content',
      async ({
        categoryId,
        category,
        session,
        attemptToken,
        requestKey,
        expectedRevision,
        commandHash,
      }) => {
        const assets = this.categoryContentAssets(category);
        const updated = await this.categoryModel
          .findOneAndUpdate(
            {
              _id: mongoEq(categoryId),
              lifecycle_status: 'active',
              revision: mongoEq(expectedRevision),
            },
            {
              $unset: {
                banner: 1,
                banner_asset: 1,
              },
              $inc: { revision: 1 },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!updated) this.revisionConflict();
        const deletedPolicy = await this.policyModel.deleteOne(
          { category_id: categoryId },
          { session },
        );
        await this.journalAssets(
          categoryId,
          requestKey,
          commandHash,
          attemptToken,
          'content-delete',
          assets,
          session,
        );
        return {
          request_key: requestKey,
          operation: 'delete-content',
          category: serializedCategory(updated),
          policy_deleted: deletedPolicy.deletedCount > 0,
          cleanup_scheduled: assets.length,
        };
      },
    );
  }

  async deleteContentLegacy(categoryIdValue: string) {
    if (!Types.ObjectId.isValid(categoryIdValue)) {
      throw new BadRequestException('Invalid category id');
    }
    await this.assertReady();
    const category = await this.categoryModel
      .findOne({
        _id: new Types.ObjectId(categoryIdValue),
        lifecycle_status: 'active',
      })
      .lean();
    if (!category)
      throw new NotFoundException('Category not found or inactive');
    return this.deleteContent(categoryIdValue, {
      request_key: `legacy-delete:${categoryIdValue}:${category.revision}:${randomUUID()}`,
      expected_revision: Number(category.revision),
    });
  }

  async retire(
    categoryIdValue: string,
    dto: CategoryLifecycleCommandDto,
  ): Promise<LifecycleResponse> {
    return this.executeLifecycle(
      categoryIdValue,
      dto,
      'retire',
      async ({
        categoryId,
        category,
        session,
        requestKey,
        expectedRevision,
      }) => {
        const normalized = normalizeCategoryIdentity(
          category.name_normalized ?? category.name,
        )?.normalized;
        const referenceCounts = await this.referenceCounts(
          categoryId,
          session,
          normalized,
        );
        this.assertNoReferences(referenceCounts, 'retired');
        const retiredAt = new Date();
        const updated = await this.categoryModel
          .findOneAndUpdate(
            {
              _id: mongoEq(categoryId),
              lifecycle_status: 'active',
              revision: mongoEq(expectedRevision),
            },
            {
              $set: {
                lifecycle_status: 'retired',
                retired_at: retiredAt,
                purge_after: new Date(
                  retiredAt.getTime() + CATEGORY_RETENTION_MS,
                ),
              },
              $inc: { revision: 1 },
            },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!updated) this.revisionConflict();
        await this.sourceModel.updateMany(
          { category_id: categoryId },
          {
            $set: {
              active: false,
              tombstoned: true,
              retired_at: retiredAt,
            },
            $inc: { revision: 1 },
          },
          { session },
        );
        return {
          request_key: requestKey,
          operation: 'retire',
          category: serializedCategory(updated),
          reference_counts: referenceCounts,
        };
      },
    );
  }

  async purge(
    categoryIdValue: string,
    dto: CategoryLifecycleCommandDto,
  ): Promise<LifecycleResponse> {
    return this.executeLifecycle(
      categoryIdValue,
      dto,
      'purge',
      async ({
        categoryId,
        category,
        session,
        attemptToken,
        requestKey,
        expectedRevision,
        commandHash,
      }) => {
        const purgeAfter = category.purge_after
          ? new Date(category.purge_after as Date)
          : null;
        if (!purgeAfter || purgeAfter.getTime() > Date.now()) {
          throw new ConflictException({
            statusCode: 409,
            code: 'POLICY_CATEGORY_RETENTION_ACTIVE',
            message:
              'Category cannot be purged before its retention period ends.',
          });
        }
        const normalized = normalizeCategoryIdentity(
          category.name_normalized ?? category.name,
        )?.normalized;
        const referenceCounts = await this.referenceCounts(
          categoryId,
          session,
          normalized,
        );
        this.assertNoReferences(referenceCounts, 'purged');
        const assets = this.categoryAssets(category);
        await this.journalAssets(
          categoryId,
          requestKey,
          commandHash,
          attemptToken,
          'category-purge',
          assets,
          session,
        );
        await this.policyModel.deleteMany(
          { category_id: categoryId },
          { session },
        );
        const deleted = await this.categoryModel.deleteOne(
          {
            _id: mongoEq(categoryId),
            lifecycle_status: 'retired',
            revision: mongoEq(expectedRevision),
            purge_after: { $lte: new Date() },
          },
          { session },
        );
        if (deleted.deletedCount !== 1) this.revisionConflict();
        await this.sourceModel.updateMany(
          { category_id: categoryId },
          {
            $set: {
              active: false,
              tombstoned: true,
              purged_at: new Date(),
            },
            $inc: { revision: 1 },
          },
          { session },
        );
        return {
          request_key: requestKey,
          operation: 'purge',
          category_id: String(categoryId),
          purged: true,
          cleanup_scheduled: assets.length,
          reference_counts: referenceCounts,
        };
      },
    );
  }

  private async executeLifecycle(
    categoryIdValue: string,
    dto: CategoryLifecycleCommandDto,
    operation: LifecycleOperation,
    handler: (context: {
      categoryId: Types.ObjectId;
      category: Record<string, unknown>;
      session: ClientSession;
      attemptToken: string;
      requestKey: string;
      expectedRevision: number;
      commandHash: string;
    }) => Promise<LifecycleResponse>,
  ): Promise<LifecycleResponse> {
    const categoryId = requireObjectId(categoryIdValue, 'category id');
    const requestKey = requireTrimmedString(
      dto.request_key,
      160,
      'request_key',
    );
    const expectedRevision = requireFiniteNumber(
      dto.expected_revision,
      'expected_revision',
    );
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision !== dto.expected_revision
    ) {
      throw new BadRequestException(
        'expected_revision must be a positive integer',
      );
    }
    await this.assertReady();
    const hash = payloadHash(operation, categoryId, expectedRevision);
    const replay = await this.readLifecycleReplay(requestKey, hash, operation);
    if (replay) return replay;

    const session = await this.connection.startSession();
    let response: LifecycleResponse | undefined;
    try {
      await session.withTransaction(async () => {
        response = undefined;
        await this.fenceReady(session);
        const existing = await this.commandModel
          .findOne({ request_key: mongoEq(requestKey) })
          .session(session)
          .lean();
        if (existing) {
          if (
            existing.payload_hash !== hash ||
            existing.operation !== operation
          ) {
            throw new ConflictException(
              'request_key was already used for a different policy command',
            );
          }
          if (existing.status === 'committed' && existing.response) {
            response = existing.response as LifecycleResponse;
            return;
          }
          throw new ConflictException(
            'This policy command is still processing',
          );
        }

        const requiredStatus = operation === 'purge' ? 'retired' : 'active';
        const category = await this.categoryModel
          .findOne({
            _id: mongoEq(categoryId),
            lifecycle_status: requiredStatus,
            revision: mongoEq(expectedRevision),
          })
          .session(session)
          .lean();
        if (!category) {
          const current = await this.categoryModel
            .findOne({ _id: mongoEq(categoryId) })
            .session(session)
            .lean();
          if (!current) throw new NotFoundException('Category not found');
          this.revisionConflict();
        }

        const attemptToken = randomUUID();
        await this.commandModel.create(
          [
            {
              request_key: requestKey,
              payload_hash: hash,
              category_id: categoryId,
              operation,
              status: 'processing',
              attempt_token: attemptToken,
              attempts: 1,
            },
          ],
          { session },
        );
        const next = await handler({
          categoryId,
          category: category as unknown as Record<string, unknown>,
          session,
          attemptToken,
          requestKey,
          expectedRevision,
          commandHash: hash,
        });
        const committed = await this.commandModel
          .findOneAndUpdate(
            {
              request_key: mongoEq(requestKey),
              payload_hash: mongoEq(hash),
              operation,
              status: 'processing',
              attempt_token: attemptToken,
            },
            { $set: { status: 'committed', response: next } },
            { returnDocument: 'after', session },
          )
          .lean();
        if (!committed) {
          throw new ConflictException('Policy command ownership was lost');
        }
        response = next;
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const collisionReplay = await this.readLifecycleReplay(
        requestKey,
        hash,
        operation,
      );
      if (collisionReplay) return collisionReplay;
      throw new ConflictException(
        'request_key collided with another policy command',
      );
    } finally {
      await session.endSession();
    }
    if (!response)
      throw new Error('Policy command committed without a response');
    return response;
  }

  private async readLifecycleReplay(
    requestKey: string,
    hash: string,
    operation: LifecycleOperation,
  ) {
    const existing = await this.commandModel
      .findOne({ request_key: mongoEq(requestKey) })
      .lean();
    if (!existing) return undefined;
    if (existing.payload_hash !== hash || existing.operation !== operation) {
      throw new ConflictException(
        'request_key was already used for a different policy command',
      );
    }
    return existing.status === 'committed' && existing.response
      ? (existing.response as LifecycleResponse)
      : undefined;
  }

  private categoryAssets(category: Record<string, unknown>) {
    const byObjectKey = new Map<string, CommandOwnedAsset>();
    for (const candidate of [category.image_asset, category.banner_asset]) {
      const asset = commandOwnedAsset(candidate);
      if (asset) byObjectKey.set(asset.object_key, asset);
    }
    return [...byObjectKey.values()];
  }

  private categoryContentAssets(category: Record<string, unknown>) {
    const asset = commandOwnedAsset(category.banner_asset);
    return asset ? [asset] : [];
  }

  private async journalAssets(
    categoryId: Types.ObjectId,
    requestKey: string,
    hash: string,
    attemptToken: string,
    reason: 'content-delete' | 'category-purge',
    assets: CommandOwnedAsset[],
    session: ClientSession,
  ) {
    await this.mediaCleanup.journalCommandOwnedAssets(
      {
        owner_type: 'category',
        owner_id: categoryId,
        request_key: requestKey,
        payload_hash: hash,
        attempt_token: attemptToken,
        reason,
        assets,
      },
      session,
    );
  }

  private assertNoReferences(
    counts: CategoryReferenceCounts,
    operation: 'retired' | 'purged',
  ) {
    if (counts.unique_offers === 0) return;
    throw new ConflictException({
      statusCode: 409,
      code: 'POLICY_CATEGORY_REFERENCED',
      message: `Category is referenced by offers and cannot be ${operation}.`,
      reference_counts: counts,
    });
  }

  private revisionConflict(): never {
    throw new ConflictException({
      statusCode: 409,
      code: 'POLICY_CATEGORY_REVISION_CONFLICT',
      message: 'Category changed; refresh and try again.',
    });
  }
}
