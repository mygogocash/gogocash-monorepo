import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { ClientSession, Model } from 'mongoose';

import { Brand } from 'src/brand/schemas/brand.schema';
import { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';
import { Category } from 'src/offer/schemas/category.schema';
import { Offer } from 'src/offer/schemas/offer.schema';

import {
  PolicyMediaAssetRegistry,
  PolicyMediaAssetRegistryDocument,
  PolicyMediaAssetState,
} from './schemas/policy-media-asset-registry.schema';

const DELETE_LEASE_MS = 60_000;
const MAX_LAST_ERROR_LENGTH = 1_000;

const CATEGORY_MEDIA_REFERENCE_FIELDS = [
  'image',
  'banner',
  'image_asset.url',
  'banner_asset.url',
] as const;
const OFFER_MEDIA_REFERENCE_FIELDS = [
  'logo',
  'logo_desktop',
  'logo_mobile',
  'logo_circle',
  'banner',
  'banner_mobile',
  'logo_asset.url',
  'banner_asset.url',
] as const;
const BRAND_MEDIA_REFERENCE_FIELDS = ['logo', 'logo_circle', 'banner'] as const;

export type PolicyMediaReferenceCounts = {
  categories: number;
  offers: number;
  brands: number;
  total: number;
};

export type PolicyMediaRegistryRow = {
  _id?: unknown;
  url_hash: string;
  url: string;
  state: PolicyMediaAssetState;
  revision: number;
  provider: 'r2';
  ownership: 'command-owned';
  owner_key: string;
  owner_attempt_token: string;
  bucket: string;
  object_key: string;
  content_sha256: string;
  original_name: string;
  content_type?: string;
  delete_token?: string;
  delete_lease_expires_at?: Date;
  deleting_at?: Date;
  deleted_at?: Date;
  last_failure_at?: Date;
  last_error?: string;
};

export type PolicyMediaAttachResult =
  { tracked: false } | { tracked: true; registry: PolicyMediaRegistryRow };

export type PolicyMediaDeleteClaimResult =
  | { claimed: false; reason: 'untracked' }
  | {
      claimed: false;
      reason: 'referenced' | 'busy';
      references: PolicyMediaReferenceCounts;
    }
  | {
      claimed: true;
      delete_token: string;
      registry: PolicyMediaRegistryRow;
      references: PolicyMediaReferenceCounts;
    };

type VerifiedCommandOwnedAsset = CommandOwnedStoredMediaAsset & {
  sha256: string;
  original_name: string;
};

export function normalizePolicyMediaUrl(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('A policy media URL is required.');
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('A policy media URL is required.');
  }
  return normalized;
}

export function policyMediaUrlHash(value: unknown): string {
  return createHash('sha256')
    .update(normalizePolicyMediaUrl(value))
    .digest('hex');
}

function verifiedCommandOwnedAsset(
  value: CommandOwnedStoredMediaAsset,
): VerifiedCommandOwnedAsset {
  if (
    !value ||
    value.provider !== 'r2' ||
    value.ownership !== 'command-owned' ||
    typeof value.owner_key !== 'string' ||
    !value.owner_key ||
    typeof value.owner_attempt_token !== 'string' ||
    !value.owner_attempt_token ||
    typeof value.bucket !== 'string' ||
    !value.bucket ||
    typeof value.object_key !== 'string' ||
    !value.object_key ||
    typeof value.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.sha256) ||
    typeof value.original_name !== 'string' ||
    !value.original_name
  ) {
    throw new BadRequestException(
      'Policy media registry requires a verified command-owned R2 asset.',
    );
  }
  normalizePolicyMediaUrl(value.url);
  return value as VerifiedCommandOwnedAsset;
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

function registryRow(value: unknown): PolicyMediaRegistryRow {
  return plain(value) as PolicyMediaRegistryRow;
}

function duplicateKey(error: unknown) {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000,
  );
}

function registryConflict(message: string): ConflictException {
  return new ConflictException({
    statusCode: 409,
    code: 'POLICY_MEDIA_ASSET_REGISTRY_CONFLICT',
    message,
  });
}

function errorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    MAX_LAST_ERROR_LENGTH,
  );
}

function exactReferences(fields: readonly string[], url: string) {
  return { $or: fields.map((field) => ({ [field]: url })) };
}

@Injectable()
export class PolicyMediaAssetRegistryService {
  constructor(
    @InjectModel(PolicyMediaAssetRegistry.name)
    private readonly registryModel: Model<PolicyMediaAssetRegistryDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<Offer>,
    @InjectModel(Brand.name)
    private readonly brandModel: Model<Brand>,
  ) {}

  async registerCommandOwnedInSession(
    value: CommandOwnedStoredMediaAsset,
    session: ClientSession,
  ): Promise<PolicyMediaRegistryRow> {
    const asset = verifiedCommandOwnedAsset(value);
    const url = normalizePolicyMediaUrl(asset.url);
    const urlHash = policyMediaUrlHash(url);
    const identity = {
      url_hash: urlHash,
      url,
      provider: 'r2' as const,
      ownership: 'command-owned' as const,
      owner_key: asset.owner_key,
      owner_attempt_token: asset.owner_attempt_token,
      bucket: asset.bucket,
      object_key: asset.object_key,
      content_sha256: asset.sha256,
      original_name: asset.original_name,
      ...(asset.content_type ? { content_type: asset.content_type } : {}),
    };
    try {
      const registered = await this.registryModel
        .findOneAndUpdate(
          { ...identity, state: 'active' },
          {
            $setOnInsert: { ...identity, state: 'active' },
            $inc: { revision: 1 },
          },
          {
            upsert: true,
            returnDocument: 'after',
            session,
            setDefaultsOnInsert: false,
          },
        )
        .lean();
      if (!registered) {
        throw registryConflict(
          'The media registry fence could not be touched.',
        );
      }
      return registryRow(registered);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (duplicateKey(error)) {
        throw registryConflict(
          'The media URL is already registered with another identity or lifecycle state.',
        );
      }
      throw error;
    }
  }

  async touchAttachInSession(
    value: string,
    session: ClientSession,
  ): Promise<PolicyMediaAttachResult> {
    const url = normalizePolicyMediaUrl(value);
    const urlHash = policyMediaUrlHash(url);
    const active = await this.registryModel
      .findOneAndUpdate(
        { url_hash: urlHash, url, state: 'active' },
        { $inc: { revision: 1 } },
        { upsert: false, returnDocument: 'after', session },
      )
      .lean();
    if (active) {
      return { tracked: true, registry: registryRow(active) };
    }

    const current = await this.registryModel
      .findOne({ url_hash: urlHash })
      .session(session)
      .lean();
    if (!current) return { tracked: false };
    const row = registryRow(current);
    if (row.url !== url) {
      throw registryConflict('A policy media URL hash collision was detected.');
    }
    throw registryConflict(
      `The policy media URL cannot be attached while it is ${row.state}.`,
    );
  }

  async beginDeleteInSession(
    value: string,
    session: ClientSession,
  ): Promise<PolicyMediaDeleteClaimResult> {
    const url = normalizePolicyMediaUrl(value);
    const urlHash = policyMediaUrlHash(url);
    const current = await this.registryModel
      .findOne({ url_hash: urlHash })
      .session(session)
      .lean();
    if (!current) return { claimed: false, reason: 'untracked' };
    const row = registryRow(current);
    if (row.url !== url) {
      throw registryConflict('A policy media URL hash collision was detected.');
    }

    // Keep these sequential: MongoDB does not support parallel operations on
    // one transaction session. The registry CAS below creates the shared write
    // conflict that serializes these reads with every tracked attachment.
    const categories = await this.categoryModel
      .countDocuments(exactReferences(CATEGORY_MEDIA_REFERENCE_FIELDS, url))
      .session(session)
      .exec();
    const offers = await this.offerModel
      .countDocuments(exactReferences(OFFER_MEDIA_REFERENCE_FIELDS, url))
      .session(session)
      .exec();
    const brands = await this.brandModel
      .countDocuments(exactReferences(BRAND_MEDIA_REFERENCE_FIELDS, url))
      .session(session)
      .exec();
    const references: PolicyMediaReferenceCounts = {
      categories,
      offers,
      brands,
      total: categories + offers + brands,
    };
    if (references.total > 0) {
      return { claimed: false, reason: 'referenced', references };
    }

    const now = new Date();
    const lease = row.delete_lease_expires_at
      ? new Date(row.delete_lease_expires_at)
      : undefined;
    const activeDeletingLease =
      row.state === 'deleting' &&
      Boolean(row.delete_token) &&
      lease instanceof Date &&
      Number.isFinite(lease.getTime()) &&
      lease > now;
    if (row.state === 'deleted' || activeDeletingLease) {
      return { claimed: false, reason: 'busy', references };
    }

    const deleteToken = randomUUID();
    const deleteLeaseExpiresAt = new Date(now.getTime() + DELETE_LEASE_MS);
    const claimed = await this.registryModel
      .findOneAndUpdate(
        {
          _id: row._id,
          url_hash: urlHash,
          url,
          revision: row.revision,
          $or: [
            { state: 'active' },
            {
              state: 'deleting',
              $or: [
                { delete_token: { $exists: false } },
                { delete_lease_expires_at: { $exists: false } },
                { delete_lease_expires_at: { $lte: now } },
              ],
            },
          ],
        },
        {
          $set: {
            state: 'deleting',
            delete_token: deleteToken,
            delete_lease_expires_at: deleteLeaseExpiresAt,
            deleting_at: now,
          },
          $unset: { deleted_at: 1, last_error: 1, last_failure_at: 1 },
          $inc: { revision: 1 },
        },
        { returnDocument: 'after', session },
      )
      .lean();
    if (!claimed) {
      return { claimed: false, reason: 'busy', references };
    }
    return {
      claimed: true,
      delete_token: deleteToken,
      registry: registryRow(claimed),
      references,
    };
  }

  async finalizeDeleted(
    value: string,
    deleteToken: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const url = normalizePolicyMediaUrl(value);
    const completed = await this.registryModel
      .findOneAndUpdate(
        {
          url_hash: policyMediaUrlHash(url),
          url,
          state: 'deleting',
          delete_token: deleteToken,
        },
        {
          $set: { state: 'deleted', deleted_at: new Date() },
          $unset: {
            delete_token: 1,
            delete_lease_expires_at: 1,
            last_error: 1,
            last_failure_at: 1,
          },
          $inc: { revision: 1 },
        },
        { returnDocument: 'after', ...(session ? { session } : {}) },
      )
      .lean();
    return Boolean(completed);
  }

  async failDelete(
    value: string,
    deleteToken: string,
    error: unknown,
    session?: ClientSession,
  ): Promise<boolean> {
    const url = normalizePolicyMediaUrl(value);
    const failed = await this.registryModel
      .findOneAndUpdate(
        {
          url_hash: policyMediaUrlHash(url),
          url,
          state: 'deleting',
          delete_token: deleteToken,
        },
        {
          $set: {
            state: 'deleting',
            last_error: errorMessage(error),
            last_failure_at: new Date(),
          },
          $unset: { delete_token: 1, delete_lease_expires_at: 1 },
          $inc: { revision: 1 },
        },
        { returnDocument: 'after', ...(session ? { session } : {}) },
      )
      .lean();
    return Boolean(failed);
  }
}
