export const DASHBOARD_INDEX_DEFINITIONS = [
  {
    collection: 'conversions',
    name: 'dashboard_conversion_scope_v1',
    key: { datetime_conversion: 1 },
  },
  {
    collection: 'users',
    name: 'dashboard_user_created_at_v1',
    key: { createdAt: 1 },
  },
  {
    collection: 'usermycashbacks',
    name: 'dashboard_mycashback_created_at_v1',
    key: { createdAt: 1 },
  },
  {
    collection: 'withdraws',
    name: 'dashboard_withdraw_currency_status_created_v1',
    key: { currency: 1, status: 1, createdAt: 1 },
  },
] as const;

type DashboardIndexCollection = {
  indexes(): Promise<
    Array<{
      name?: string;
      key?: Record<string, number>;
      hidden?: boolean;
      sparse?: boolean;
      unique?: boolean;
      partialFilterExpression?: Record<string, unknown>;
      collation?: Record<string, unknown>;
      expireAfterSeconds?: number;
    }>
  >;
  createIndex(
    key: Record<string, number>,
    options: { name: string },
  ): Promise<string>;
};

export type DashboardIndexDatabase = {
  collection(name: string): DashboardIndexCollection;
};

type DashboardIndexAction = 'ready' | 'missing' | 'created' | 'conflict';

function sameKey(
  actual: Record<string, number> | undefined,
  expected: Record<string, number>,
): boolean {
  return JSON.stringify(actual ?? {}) === JSON.stringify(expected);
}

function isUsableReadIndex(index: {
  hidden?: boolean;
  sparse?: boolean;
  unique?: boolean;
  partialFilterExpression?: Record<string, unknown>;
  collation?: Record<string, unknown>;
  expireAfterSeconds?: number;
}): boolean {
  const simpleCollation =
    index.collation === undefined || index.collation.locale === 'simple';
  return (
    index.hidden !== true &&
    index.sparse !== true &&
    index.unique !== true &&
    index.partialFilterExpression === undefined &&
    index.expireAfterSeconds === undefined &&
    simpleCollation
  );
}

async function collectionIndexes(collection: DashboardIndexCollection) {
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

/**
 * Idempotent, non-unique read-index rollout for dashboard queries. It performs
 * no data backfill and never inspects or changes provider identity indexes.
 */
export async function migrateDashboardIndexes(
  database: DashboardIndexDatabase,
  options: { apply: boolean },
) {
  const reports: Array<{
    collection: string;
    name: string;
    ready: boolean;
    action: DashboardIndexAction;
  }> = [];

  for (const definition of DASHBOARD_INDEX_DEFINITIONS) {
    const collection = database.collection(definition.collection);
    const indexes = await collectionIndexes(collection);
    const named = indexes.find((index) => index.name === definition.name);
    const equivalent = indexes.find(
      (index) =>
        sameKey(index.key, definition.key as Record<string, number>) &&
        isUsableReadIndex(index),
    );
    if (equivalent) {
      reports.push({
        collection: definition.collection,
        name: definition.name,
        ready: true,
        action: 'ready',
      });
      continue;
    }
    if (named) {
      if (!options.apply) {
        reports.push({
          collection: definition.collection,
          name: definition.name,
          ready: false,
          action: 'conflict',
        });
        continue;
      }
      throw new Error(
        `Conflicting index ${definition.name} exists on ${definition.collection}; resolve it in a reviewed change window before applying.`,
      );
    }
    if (!options.apply) {
      reports.push({
        collection: definition.collection,
        name: definition.name,
        ready: false,
        action: 'missing',
      });
      continue;
    }

    let createError: unknown;
    try {
      await collection.createIndex(definition.key as Record<string, number>, {
        name: definition.name,
      });
    } catch (error) {
      // A concurrent, identical runner may win the create race. Re-read below
      // and accept only the exact requested key; every other failure rethrows.
      createError = error;
    }
    const verified = (await collectionIndexes(collection)).find(
      (index) =>
        sameKey(index.key, definition.key as Record<string, number>) &&
        isUsableReadIndex(index),
    );
    if (!verified) {
      if (createError) throw createError;
      throw new Error(
        `Dashboard index ${definition.name} on ${definition.collection} could not be verified after creation.`,
      );
    }
    reports.push({
      collection: definition.collection,
      name: definition.name,
      ready: true,
      action: createError ? 'ready' : 'created',
    });
  }

  return {
    applied: options.apply,
    ready: reports.every((index) => index.ready),
    indexes: reports,
  };
}
