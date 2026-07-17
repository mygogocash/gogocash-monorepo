export const CONVERSION_PROVIDER_IDENTITY_INDEX =
  'uniq_conversion_provider_identity';
const CONVERSION_RAW_ID_INDEX = 'conversion_id_1';

type IndexInfo = {
  name?: string;
  key?: Record<string, number>;
  unique?: boolean;
};

export type ConversionMigrationCollection = {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  aggregate<T>(pipeline: unknown[]): { toArray(): Promise<T[]> };
  indexes(): Promise<IndexInfo[]>;
  updateMany(
    filter: Record<string, unknown>,
    update: unknown[],
  ): Promise<{ modifiedCount: number }>;
  createIndex(
    key: Record<string, number>,
    options: Record<string, unknown>,
  ): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
};

export type ConversionProviderIndexMigrationReport = {
  total: number;
  needs_backfill: number;
  duplicate_identities: Array<{
    _id: {
      source: string;
      provider_account: string;
      provider_conversion_id: string;
    };
    count: number;
  }>;
  modified: number;
  provider_index_ready: boolean;
  legacy_unique_index_present: boolean;
  applied: boolean;
};

const providerKey = {
  source: 1,
  provider_account: 1,
  provider_conversion_id: 1,
};

function sameKey(
  actual: Record<string, number> | undefined,
  expected: Record<string, number>,
): boolean {
  return JSON.stringify(actual ?? {}) === JSON.stringify(expected);
}

async function collectionIndexes(
  collection: ConversionMigrationCollection,
): Promise<IndexInfo[]> {
  try {
    return await collection.indexes();
  } catch (error) {
    const mongoError = error as { code?: number; codeName?: string };
    if (mongoError.code === 26 || mongoError.codeName === 'NamespaceNotFound') {
      return [];
    }
    throw error;
  }
}

const effectiveIdentityProjection = {
  source: { $ifNull: ['$source', 'involve'] },
  provider_account: {
    $ifNull: [
      '$provider_account',
      { $ifNull: ['$network_account', 'default'] },
    ],
  },
  provider_conversion_id: {
    $ifNull: ['$provider_conversion_id', { $toString: '$conversion_id' }],
  },
};

async function duplicateIdentities(collection: ConversionMigrationCollection) {
  return collection
    .aggregate<
      ConversionProviderIndexMigrationReport['duplicate_identities'][number]
    >([
      { $project: effectiveIdentityProjection },
      {
        $group: {
          _id: {
            source: '$source',
            provider_account: '$provider_account',
            provider_conversion_id: '$provider_conversion_id',
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 25 },
    ])
    .toArray();
}

export async function migrateConversionProviderIdentity(
  collection: ConversionMigrationCollection,
  options: { apply: boolean },
): Promise<ConversionProviderIndexMigrationReport> {
  const missingFilter = {
    $or: [
      { source: { $exists: false } },
      { provider_account: { $exists: false } },
      { provider_conversion_id: { $exists: false } },
    ],
  };
  const [total, needsBackfill, duplicates, initialIndexes] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments(missingFilter),
    duplicateIdentities(collection),
    collectionIndexes(collection),
  ]);
  if (duplicates.length > 0) {
    throw new Error(
      `Conversion provider identity migration found ${duplicates.length} duplicate canonical identities; resolve them before index changes.`,
    );
  }

  const initialProviderIndex = initialIndexes.find(
    (index) => index.name === CONVERSION_PROVIDER_IDENTITY_INDEX,
  );
  const initialRawIndex = initialIndexes.find((index) =>
    sameKey(index.key, { conversion_id: 1 }),
  );
  if (!options.apply) {
    return {
      total,
      needs_backfill: needsBackfill,
      duplicate_identities: duplicates,
      modified: 0,
      provider_index_ready: Boolean(
        initialProviderIndex?.unique &&
        sameKey(initialProviderIndex.key, providerKey),
      ),
      legacy_unique_index_present: initialRawIndex?.unique === true,
      applied: false,
    };
  }

  const backfill = await collection.updateMany(missingFilter, [
    { $set: effectiveIdentityProjection },
  ]);
  const duplicatesAfterBackfill = await duplicateIdentities(collection);
  if (duplicatesAfterBackfill.length > 0) {
    throw new Error(
      'Conversion provider identity migration produced duplicate canonical identities; no index was changed.',
    );
  }

  let indexes = await collectionIndexes(collection);
  const providerIndex = indexes.find(
    (index) => index.name === CONVERSION_PROVIDER_IDENTITY_INDEX,
  );
  if (
    providerIndex &&
    (!providerIndex.unique || !sameKey(providerIndex.key, providerKey))
  ) {
    await collection.dropIndex(CONVERSION_PROVIDER_IDENTITY_INDEX);
    indexes = await collectionIndexes(collection);
  }
  if (
    !indexes.some(
      (index) => index.unique === true && sameKey(index.key, providerKey),
    )
  ) {
    await collection.createIndex(providerKey, {
      name: CONVERSION_PROVIDER_IDENTITY_INDEX,
      unique: true,
      partialFilterExpression: {
        provider_account: { $type: 'string' },
        provider_conversion_id: { $type: 'string' },
      },
    });
  }

  indexes = await collectionIndexes(collection);
  const rawUnique = indexes.find(
    (index) =>
      index.unique === true && sameKey(index.key, { conversion_id: 1 }),
  );
  if (rawUnique?.name) await collection.dropIndex(rawUnique.name);
  indexes = await collectionIndexes(collection);
  if (!indexes.some((index) => sameKey(index.key, { conversion_id: 1 }))) {
    await collection.createIndex(
      { conversion_id: 1 },
      { name: CONVERSION_RAW_ID_INDEX },
    );
  }

  const finalIndexes = await collectionIndexes(collection);
  return {
    total,
    needs_backfill: needsBackfill,
    duplicate_identities: duplicatesAfterBackfill,
    modified: backfill.modifiedCount,
    provider_index_ready: finalIndexes.some(
      (index) => index.unique === true && sameKey(index.key, providerKey),
    ),
    legacy_unique_index_present: finalIndexes.some(
      (index) =>
        index.unique === true && sameKey(index.key, { conversion_id: 1 }),
    ),
    applied: true,
  };
}
