import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import {
  CATEGORY_INTEGRITY_MIGRATION_VERSION,
  CategoryIntegrityService,
  normalizeCategoryIdentity,
} from './category-integrity.service';
import { PolicyIntegrityFenceService } from './policy-integrity-fence.service';

const CATEGORY_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const ALIAS_CATEGORY_ID = new Types.ObjectId('507f1f77bcf86cd799439022');

function query<T>(value: T) {
  return {
    read: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function makeHarness(
  options: {
    capability?: boolean;
    markerReady?: boolean;
    indexesReady?: boolean;
    category?: Record<string, unknown> | null;
    directIds?: unknown[];
    normalizedIds?: unknown[];
    sourceKeys?: string[];
    sourceAlias?: Record<string, unknown> | null;
    sourceAliases?: Record<string, unknown>[];
    unexpectedOfferPartial?: boolean;
    registryIndexesReady?: boolean;
    writeCommandIndexesReady?: boolean;
    markerState?: Record<string, unknown> | null;
  } = {},
) {
  const category =
    options.category === undefined
      ? {
          _id: CATEGORY_ID,
          name: 'Travel Deals',
          name_normalized: 'travel deals',
          lifecycle_status: 'active',
          revision: 3,
          icon_key: 'travel',
        }
      : options.category;
  const categoryModel: any = {
    findOne: jest.fn(() => query(category)),
    findOneAndUpdate: jest.fn((_filter, update) =>
      query(
        category
          ? {
              ...category,
              ...(update.$set ?? {}),
              revision:
                Number((category as Record<string, unknown>).revision ?? 0) +
                Number(update.$inc?.revision ?? 0),
            }
          : null,
      ),
    ),
    deleteOne: jest.fn(() => query({ deletedCount: 1 })),
    create: jest.fn(async (rows: unknown[]) => rows),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'policy_category_name_normalized_v2',
                key: { name_normalized: 1 },
                unique: true,
                partialFilterExpression: {
                  name_normalized: { $type: 'string' },
                },
              },
            ],
      ),
    },
  };
  const offerModel: any = {
    distinct: jest
      .fn()
      .mockImplementation((_field: string, filter: Record<string, unknown>) =>
        query(
          'policy_category_id' in filter
            ? (options.directIds ?? [])
            : (options.normalizedIds ?? []),
        ),
      ),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'policy_category_id_1',
                key: { policy_category_id: 1 },
                ...(options.unexpectedOfferPartial
                  ? {
                      partialFilterExpression: {
                        policy_category_id: { $type: 'string' },
                      },
                    }
                  : {}),
              },
              {
                name: 'categories_normalized_1',
                key: { categories_normalized: 1 },
              },
            ],
      ),
    },
  };
  const policyModel: any = {
    deleteOne: jest.fn(() => query({ deletedCount: 1 })),
    deleteMany: jest.fn(() => query({ deletedCount: 1 })),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'category_id_1',
                key: { category_id: 1 },
                unique: true,
              },
            ],
      ),
    },
  };
  const sourceAliases =
    options.sourceAliases ??
    (options.sourceAlias === undefined || options.sourceAlias === null
      ? []
      : [options.sourceAlias]);
  const sourceModel: any = {
    findOne: jest.fn((filter: Record<string, unknown>) =>
      query(
        sourceAliases.find((row) =>
          Object.entries(filter).every(([key, expected]) => {
            if (expected && typeof expected === 'object' && '$ne' in expected) {
              return String(row[key]) !== String(expected.$ne);
            }
            return String(row[key]) === String(expected);
          }),
        ) ?? null,
      ),
    ),
    distinct: jest.fn(() => query(options.sourceKeys ?? [])),
    findOneAndUpdate: jest.fn(() => query(null)),
    updateMany: jest.fn(() => query({ modifiedCount: 1 })),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'policy_category_source_identity_v2',
                key: { source: 1, source_key: 1 },
                unique: true,
              },
              {
                name: 'policy_category_source_category_id_v2',
                key: { category_id: 1 },
              },
            ],
      ),
    },
  };
  const markerState =
    options.markerState !== undefined
      ? options.markerState
      : options.markerReady === false
        ? null
        : {
            key: 'category-integrity',
            status: 'ready',
            migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
          };
  const stateModel: any = {
    findOne: jest.fn((filter: Record<string, unknown>) => {
      if (!markerState) return query(null);
      const matches = Object.entries(filter).every(
        ([key, expected]) => markerState[key] === expected,
      );
      return query(matches ? markerState : null);
    }),
    findOneAndUpdate: jest.fn(() =>
      query(
        options.markerReady === false
          ? null
          : {
              key: 'category-integrity',
              status: 'ready',
              migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
              write_epoch: 1,
            },
      ),
    ),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'policy_integrity_state_key_v2',
                key: { key: 1 },
                unique: true,
              },
            ],
      ),
    },
  };
  let command: Record<string, any> | null = null;
  const commandModel: any = {
    findOne: jest.fn(() => query(command)),
    create: jest.fn(async (rows: Record<string, any>[]) => {
      command = { ...rows[0] };
      return rows;
    }),
    findOneAndUpdate: jest.fn((_filter, update) => {
      if (!command) return query(null);
      command = { ...command, ...(update.$set ?? {}) };
      return query(command);
    }),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'request_key_1',
                key: { request_key: 1 },
                unique: true,
              },
            ],
      ),
    },
  };
  const writeCommandModel: any = {
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.writeCommandIndexesReady === false ||
          options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'request_key_1',
                key: { request_key: 1 },
                unique: true,
              },
              {
                name: 'planned_asset_owner_1_attempt_1_object_1',
                key: {
                  'planned_assets.asset.owner_key': 1,
                  'planned_assets.asset.owner_attempt_token': 1,
                  'planned_assets.asset.object_key': 1,
                },
                partialFilterExpression: {
                  'planned_assets.asset.object_key': { $type: 'string' },
                },
              },
            ],
      ),
    },
  };
  const cleanupModel: any = {
    findOneAndUpdate: jest.fn(() => query({ _id: 'cleanup' })),
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'request_key_1_payload_hash_1_attempt_token_1_reason_1_asset.object_key_1',
                key: {
                  request_key: 1,
                  payload_hash: 1,
                  attempt_token: 1,
                  reason: 1,
                  'asset.object_key': 1,
                },
                unique: true,
                partialFilterExpression: {
                  'asset.object_key': { $type: 'string' },
                },
              },
            ],
      ),
    },
  };
  const registryModel: any = {
    collection: {
      indexes: jest.fn().mockResolvedValue(
        options.registryIndexesReady === false || options.indexesReady === false
          ? [{ name: '_id_', key: { _id: 1 } }]
          : [
              {
                name: 'policy_media_asset_registry_url_hash_v1',
                key: { url_hash: 1 },
                unique: true,
              },
              {
                name: 'policy_media_asset_registry_state_lease_v1',
                key: { state: 1, delete_lease_expires_at: 1 },
              },
            ],
      ),
    },
  };
  const session = {
    withTransaction: jest.fn(async (callback: () => Promise<void>) =>
      callback(),
    ),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const connection: any = {
    db: {
      admin: () => ({
        command: jest
          .fn()
          .mockResolvedValue(
            options.capability === false
              ? { isWritablePrimary: true }
              : { setName: 'rs0', logicalSessionTimeoutMinutes: 30 },
          ),
      }),
    },
    startSession: jest.fn().mockResolvedValue(session),
  };
  const mediaCleanup = {
    journalLegacyReplacements: jest.fn().mockResolvedValue([]),
    journalCommandOwnedAssets: jest.fn().mockResolvedValue([]),
    processRequest: jest.fn().mockResolvedValue({ deleted: 0, pending: 0 }),
  };

  const integrityFence = new PolicyIntegrityFenceService(
    connection,
    categoryModel,
    offerModel,
    policyModel,
    sourceModel,
    stateModel,
    commandModel,
    writeCommandModel,
    cleanupModel,
    registryModel,
  );
  const service = new CategoryIntegrityService(
    connection,
    categoryModel,
    offerModel,
    policyModel,
    sourceModel,
    stateModel,
    commandModel,
    mediaCleanup as never,
    {
      touchAttachInSession: jest.fn().mockResolvedValue({ tracked: false }),
    } as never,
    integrityFence,
  );
  return {
    service,
    session,
    categoryModel,
    offerModel,
    policyModel,
    sourceModel,
    stateModel,
    commandModel,
    writeCommandModel,
    cleanupModel,
    registryModel,
    integrityFence,
    mediaCleanup,
  };
}

describe('normalizeCategoryIdentity', () => {
  it('uses NFKC, trim, collapsed whitespace, and lowercase', () => {
    expect(normalizeCategoryIdentity('  ＴＲＡＶＥＬ\t  Deals  ')).toEqual({
      display: 'TRAVEL Deals',
      normalized: 'travel deals',
    });
  });

  it('returns null for blank/custom bypass inputs', () => {
    expect(normalizeCategoryIdentity('   ')).toBeNull();
    expect(normalizeCategoryIdentity('custom')).toEqual({
      display: 'custom',
      normalized: 'custom',
    });
  });
});

describe('CategoryIntegrityService readiness', () => {
  it('fails closed when MongoDB has no transaction support', async () => {
    const { service, stateModel } = makeHarness({ capability: false });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_TRANSACTIONS_UNSUPPORTED',
      }),
    });
    expect(stateModel.findOne).not.toHaveBeenCalled();
  });

  it('fails closed when the durable migration marker is absent', async () => {
    const { service } = makeHarness({ markerReady: false });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
      }),
    });
  });

  it('fails closed when any required exact index is absent', async () => {
    const { service } = makeHarness({ indexesReady: false });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
      }),
    });
  });

  it('fails closed when a non-partial index is replaced by an unexpected partial index', async () => {
    const { service } = makeHarness({ unexpectedOfferPartial: true });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
        missing: expect.arrayContaining(['offers.policy_category_id_1']),
      }),
    });
  });

  it('fails closed when either exact media registry lifecycle index is absent', async () => {
    const { service } = makeHarness({ registryIndexesReady: false });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
        missing: expect.arrayContaining([
          'policy_media_asset_registry.policy_media_asset_registry_url_hash_v1',
          'policy_media_asset_registry.policy_media_asset_registry_state_lease_v1',
        ]),
      }),
    });
  });

  it('fails closed when durable media-write ownership indexes are absent', async () => {
    const { service } = makeHarness({ writeCommandIndexesReady: false });
    await expect(service.assertReady(true)).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        missing: expect.arrayContaining([
          'policy_media_write_commands.request_key_1',
          'policy_media_write_commands.planned_asset_owner_1_attempt_1_object_1',
        ]),
      }),
    });
  });
});

describe('CategoryIntegrityService normal-write activation latch', () => {
  it('uses the legacy branch on standalone only while the durable state row is absent', async () => {
    const { service, stateModel } = makeHarness({
      capability: false,
      markerState: null,
    });
    const legacy = jest.fn().mockResolvedValue('legacy');
    const enforced = jest.fn().mockResolvedValue('enforced');

    await expect(service.withNormalWrite({ legacy, enforced })).resolves.toBe(
      'legacy',
    );

    expect(legacy).toHaveBeenCalledTimes(1);
    expect(enforced).not.toHaveBeenCalled();
    expect(stateModel.findOne).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['applying', CATEGORY_INTEGRITY_MIGRATION_VERSION],
    ['failed', CATEGORY_INTEGRITY_MIGRATION_VERSION],
    ['unknown', CATEGORY_INTEGRITY_MIGRATION_VERSION],
    ['ready', CATEGORY_INTEGRITY_MIGRATION_VERSION - 1],
  ])(
    'blocks both normal-write branches for %s state at migration version %s',
    async (status, migrationVersion) => {
      const { service } = makeHarness({
        capability: false,
        markerState: {
          key: 'category-integrity',
          status,
          migration_version: migrationVersion,
        },
      });
      const legacy = jest.fn().mockResolvedValue('legacy');
      const enforced = jest.fn().mockResolvedValue('enforced');

      await expect(
        service.withNormalWrite({ legacy, enforced }),
      ).rejects.toMatchObject({
        status: 503,
        response: expect.objectContaining({
          code: 'POLICY_CATEGORY_INTEGRITY_NOT_READY',
        }),
      });
      expect(legacy).not.toHaveBeenCalled();
      expect(enforced).not.toHaveBeenCalled();
    },
  );

  it('requires full readiness before choosing the enforced branch for ready v2', async () => {
    const { service } = makeHarness({ capability: false });
    const legacy = jest.fn().mockResolvedValue('legacy');
    const enforced = jest.fn().mockResolvedValue('enforced');

    await expect(
      service.withNormalWrite({ legacy, enforced }),
    ).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        code: 'POLICY_TRANSACTIONS_UNSUPPORTED',
      }),
    });
    expect(legacy).not.toHaveBeenCalled();
    expect(enforced).not.toHaveBeenCalled();
  });

  it('uses the enforced branch only for a fully ready v2 deployment', async () => {
    const { service } = makeHarness();
    const legacy = jest.fn().mockResolvedValue('legacy');
    const enforced = jest.fn().mockResolvedValue('enforced');

    await expect(service.withNormalWrite({ legacy, enforced })).resolves.toBe(
      'enforced',
    );
    expect(legacy).not.toHaveBeenCalled();
    expect(enforced).toHaveBeenCalledTimes(1);
  });

  it('does not cache an absent state-row decision across normal writes', async () => {
    const { service, stateModel } = makeHarness({ markerState: null });
    stateModel.findOne
      .mockImplementationOnce(() => query(null))
      .mockImplementation((filter: Record<string, unknown>) => {
        const marker = {
          key: 'category-integrity',
          status: 'ready',
          migration_version: CATEGORY_INTEGRITY_MIGRATION_VERSION,
        };
        return query(
          Object.entries(filter).every(
            ([key, expected]) => marker[key] === expected,
          )
            ? marker
            : null,
        );
      });
    const legacy = jest.fn().mockResolvedValue('legacy');
    const enforced = jest.fn().mockResolvedValue('enforced');

    await expect(service.withNormalWrite({ legacy, enforced })).resolves.toBe(
      'legacy',
    );
    await expect(service.withNormalWrite({ legacy, enforced })).resolves.toBe(
      'enforced',
    );

    expect(legacy).toHaveBeenCalledTimes(1);
    expect(enforced).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy category creation available before activation without opening a session', async () => {
    const { service, categoryModel, session } = makeHarness({
      capability: false,
      markerState: null,
    });
    categoryModel.create.mockResolvedValue({
      _id: CATEGORY_ID,
      name: 'Travel Deals',
    });

    await expect(
      service.createLegacyCategory(' Travel Deals '),
    ).resolves.toEqual({
      _id: CATEGORY_ID,
      name: 'Travel Deals',
    });

    expect(categoryModel.create).toHaveBeenCalledWith({ name: 'Travel Deals' });
    expect(session.withTransaction).not.toHaveBeenCalled();
  });

  it('preserves the legacy display spelling before activation', async () => {
    const { service, categoryModel } = makeHarness({ markerState: null });
    categoryModel.create.mockImplementation(async (value) => value);

    await expect(
      service.createLegacyCategory('  Ｔｒａｖｅｌ   Deals  '),
    ).resolves.toEqual({ name: 'Ｔｒａｖｅｌ   Deals' });

    expect(categoryModel.create).toHaveBeenCalledWith({
      name: 'Ｔｒａｖｅｌ   Deals',
    });
  });

  it('translates a duplicate legacy category into the established admin validation error', async () => {
    const { service, categoryModel } = makeHarness({ markerState: null });
    categoryModel.create.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    await expect(
      service.createLegacyCategory('Travel Deals'),
    ).rejects.toMatchObject({
      constructor: BadRequestException,
      message: 'A category named "Travel Deals" already exists.',
    });
  });
});

describe('CategoryIntegrityService reference accounting', () => {
  it('reports exact direct, normalized, and unique global offer counts', async () => {
    const { service } = makeHarness({
      directIds: ['offer-a', 'offer-b'],
      normalizedIds: ['offer-b', 'offer-c'],
    });
    await expect(service.referenceCounts(CATEGORY_ID)).resolves.toEqual({
      offer_policy_category_id: 2,
      offer_categories_normalized: 2,
      unique_offers: 3,
    });
  });

  it('counts normalized offer references across retained aliases for the category', async () => {
    const { service, offerModel, sourceModel } = makeHarness({
      sourceKeys: ['old travel', 'travel deals'],
      normalizedIds: ['offer-old-alias'],
    });

    await expect(service.referenceCounts(CATEGORY_ID)).resolves.toMatchObject({
      offer_categories_normalized: 1,
      unique_offers: 1,
    });
    expect(sourceModel.distinct).toHaveBeenCalledWith('source_key', {
      category_id: CATEGORY_ID,
    });
    expect(offerModel.distinct).toHaveBeenCalledWith('_id', {
      categories_normalized: {
        $in: expect.arrayContaining(['old travel', 'travel deals']),
      },
    });
  });
});

describe('CategoryIntegrityService assignment fencing', () => {
  it('fences a legacy policy-content writer against lifecycle revision changes', async () => {
    const { service, categoryModel, session } = makeHarness();
    const writer = jest.fn().mockResolvedValue({ saved: true });

    await expect(
      service.withPolicyContentMutation(String(CATEGORY_ID), writer),
    ).resolves.toEqual({ saved: true });
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: CATEGORY_ID,
        lifecycle_status: 'active',
        revision: 3,
      },
      { $inc: { revision: 1 } },
      expect.objectContaining({ returnDocument: 'after', session }),
    );
    expect(writer).toHaveBeenCalledWith(session);
  });

  it('reserves a normalized rename alias for the caller-owned category CAS', async () => {
    const { service, categoryModel, sourceModel, session } = makeHarness();
    categoryModel.findOne.mockReturnValueOnce(query(null));

    await expect(
      service.reserveLegacyCategoryRenameInSession(
        String(CATEGORY_ID),
        ' New Travel Name ',
        session as never,
      ),
    ).resolves.toEqual({
      name: 'New Travel Name',
      name_normalized: 'new travel name',
    });

    expect(categoryModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sourceModel.findOneAndUpdate).toHaveBeenCalledWith(
      { source: 'legacy', source_key: 'new travel name' },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          category_id: CATEGORY_ID,
          active: true,
          tombstoned: false,
        }),
      }),
      expect.objectContaining({ upsert: true, session }),
    );
  });

  it('legacy create rejects a retained active alias owned by another category', async () => {
    const { service, categoryModel } = makeHarness({
      category: null,
      sourceAliases: [
        {
          source: 'policy-admin',
          source_key: 'travel deals',
          category_id: CATEGORY_ID,
          active: true,
          tombstoned: false,
        },
      ],
    });

    await expect(service.createLegacyCategory('Travel Deals')).rejects.toThrow(
      'already exists or is reserved',
    );
    expect(categoryModel.create).not.toHaveBeenCalled();
  });

  it('touches category revision in the same session as a mapped writer', async () => {
    const { service, categoryModel, session } = makeHarness();
    const writer = jest.fn().mockResolvedValue({ saved: true });
    await expect(
      service.withPolicyCategoryAssignment(
        String(CATEGORY_ID),
        ' Travel  Deals ',
        writer,
      ),
    ).resolves.toEqual({ saved: true });
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: CATEGORY_ID,
        lifecycle_status: 'active',
      }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ session }),
    );
    expect(writer).toHaveBeenCalledWith(
      {
        policy_category_id: String(CATEGORY_ID),
        categories_normalized: 'travel deals',
      },
      session,
    );
  });

  it('loads the raw category inside the assignment transaction before deriving normalization', async () => {
    const { service, session } = makeHarness();
    const loadRawCategory = jest.fn().mockResolvedValue('Travel Deals');
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withPolicyCategoryAssignment(
        String(CATEGORY_ID),
        loadRawCategory,
        writer,
      ),
    ).resolves.toBe('saved');

    expect(loadRawCategory).toHaveBeenCalledWith(session);
    expect(writer).toHaveBeenCalledWith(
      {
        policy_category_id: String(CATEGORY_ID),
        categories_normalized: 'travel deals',
      },
      session,
    );
  });

  it('emits an explicit unset when a direct assignment is cleared while deriving the current raw category', async () => {
    const { service, session } = makeHarness();
    const loadRawCategory = jest.fn().mockResolvedValue('   ');
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withPolicyCategoryAssignment('', loadRawCategory, writer),
    ).resolves.toBe('saved');

    expect(loadRawCategory).toHaveBeenCalledWith(session);
    expect(writer).toHaveBeenCalledWith(
      {
        unset_policy_category_id: true,
        categories_normalized: null,
      },
      session,
    );
  });

  it('keeps the normalized raw-category reference when clearing only the direct assignment', async () => {
    const { service, session } = makeHarness();
    const loadRawCategory = jest.fn().mockResolvedValue(' Travel  Deals ');
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withPolicyCategoryAssignment('', loadRawCategory, writer),
    ).resolves.toBe('saved');

    expect(writer).toHaveBeenCalledWith(
      {
        unset_policy_category_id: true,
        categories_normalized: 'travel deals',
      },
      session,
    );
  });

  it('lets blank/custom inputs bypass mapped readiness safely', async () => {
    const { service, stateModel } = makeHarness({ markerReady: false });
    const writer = jest.fn().mockResolvedValue('saved');
    await expect(
      service.withPolicyCategoryAssignment('custom', '   ', writer),
    ).resolves.toBe('saved');
    expect(stateModel.findOne).not.toHaveBeenCalled();
    expect(writer).toHaveBeenCalledWith(
      {
        policy_category_id: 'custom',
        categories_normalized: null,
      },
      undefined,
    );
  });

  it('fences a custom-policy writer when its raw category resolves to an active category', async () => {
    const { service, categoryModel, session } = makeHarness();
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withPolicyCategoryAssignment('custom', 'Travel Deals', writer),
    ).resolves.toBe('saved');
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name_normalized: 'travel deals',
        lifecycle_status: 'active',
      }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ session }),
    );
    expect(writer).toHaveBeenCalledWith(
      {
        policy_category_id: 'custom',
        categories_normalized: 'travel deals',
      },
      session,
    );
  });

  it('resolves and fences a retained active alias after a category rename', async () => {
    const { service, categoryModel, session } = makeHarness({
      sourceAliases: [
        {
          source: 'policy-admin',
          source_key: 'old travel name',
          category_id: ALIAS_CATEGORY_ID,
          active: true,
          tombstoned: false,
        },
      ],
    });
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withPolicyCategoryAssignment('custom', 'Old Travel Name', writer),
    ).resolves.toBe('saved');
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: ALIAS_CATEGORY_ID,
        lifecycle_status: 'active',
      }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ session }),
    );
    expect(writer).toHaveBeenCalledWith(
      {
        policy_category_id: 'custom',
        categories_normalized: 'old travel name',
      },
      session,
    );
  });

  it('journals replaced legacy category media in the metadata transaction and processes it only after commit', async () => {
    const { service, categoryModel, mediaCleanup, session } = makeHarness({
      category: {
        _id: CATEGORY_ID,
        name: 'Travel Deals',
        name_normalized: 'travel deals',
        lifecycle_status: 'active',
        revision: 3,
        image: 'https://media.example/old-icon.png',
        banner: 'https://media.example/old-banner.png',
      },
    });
    mediaCleanup.journalLegacyReplacements.mockResolvedValue([
      { _id: 'cleanup-a' },
      { _id: 'cleanup-b' },
    ]);

    await service.updateLegacyCategoryMetadata(String(CATEGORY_ID), {
      image: 'https://media.example/new-icon.png',
      banner: 'https://media.example/new-banner.png',
    });

    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: CATEGORY_ID }),
      expect.objectContaining({
        $unset: { image_asset: 1, banner_asset: 1 },
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ session }),
    );
    expect(mediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_type: 'category',
        owner_id: CATEGORY_ID,
        reason: 'legacy-category-replaced',
        references: [
          'https://media.example/old-icon.png',
          'https://media.example/old-banner.png',
        ],
      }),
      session,
    );
    expect(mediaCleanup.processRequest).toHaveBeenCalledWith(
      expect.stringMatching(/^legacy-category-media:/),
    );
    expect(
      mediaCleanup.journalLegacyReplacements.mock.invocationCallOrder[0],
    ).toBeLessThan(mediaCleanup.processRequest.mock.invocationCallOrder[0]);
  });

  it('preserves the full command-owned asset proof when legacy metadata replaces it', async () => {
    const ownedAsset = {
      provider: 'r2',
      ownership: 'command-owned',
      owner_key: 'aggregate-owned-media',
      owner_attempt_token: 'owned-attempt',
      url: 'https://media.example/owned-icon.png',
      bucket: 'media',
      object_key: `categories/aggregate-owned-media/owned-attempt/${'a'.repeat(64)}.png`,
      sha256: 'a'.repeat(64),
      original_name: 'owned-icon.png',
      content_type: 'image/png',
    };
    const { service, mediaCleanup, session } = makeHarness({
      category: {
        _id: CATEGORY_ID,
        name: 'Owned Media',
        name_normalized: 'owned media',
        lifecycle_status: 'active',
        revision: 3,
        image: ownedAsset.url,
        image_asset: ownedAsset,
      },
    });
    mediaCleanup.journalLegacyReplacements.mockResolvedValue([
      { _id: 'owned-cleanup' },
    ]);

    await service.updateLegacyCategoryMetadata(String(CATEGORY_ID), {
      image: 'https://media.example/replacement.png',
    });

    expect(mediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
      expect.objectContaining({
        references: [ownedAsset.url, ownedAsset],
      }),
      session,
    );
  });

  it('surfaces a deterministic retry key when postcommit category media cleanup fails', async () => {
    const { service, mediaCleanup } = makeHarness({
      category: {
        _id: CATEGORY_ID,
        name: 'Cleanup Retry',
        name_normalized: 'cleanup retry',
        lifecycle_status: 'active',
        revision: 3,
        image: 'https://media.example/old-retry-icon.png',
      },
    });
    mediaCleanup.journalLegacyReplacements.mockResolvedValue([
      { _id: 'pending-cleanup' },
    ]);
    mediaCleanup.processRequest.mockRejectedValueOnce(
      new Error('cleanup worker unavailable'),
    );

    await expect(
      service.updateLegacyCategoryMetadata(String(CATEGORY_ID), {
        image: 'https://media.example/new-retry-icon.png',
      }),
    ).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining(
        `legacy-category-media:${CATEGORY_ID}:v1`,
      ),
    });
    expect(mediaCleanup.journalLegacyReplacements).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: `legacy-category-media:${CATEGORY_ID}:v1`,
        attempt_token: `legacy-category-media:${CATEGORY_ID}:v1`,
      }),
      expect.anything(),
    );

    await expect(
      service.updateLegacyCategoryMetadata(String(CATEGORY_ID), {
        image: 'https://media.example/new-retry-icon.png',
      }),
    ).resolves.toMatchObject({
      image: 'https://media.example/new-retry-icon.png',
    });
    expect(mediaCleanup.processRequest).toHaveBeenNthCalledWith(
      2,
      `legacy-category-media:${CATEGORY_ID}:v1`,
    );
  });

  it('preserves a raw Involve offer and never resurrects a tombstoned alias', async () => {
    const { service, categoryModel, sourceModel, session } = makeHarness({
      sourceAlias: {
        source: 'involve',
        source_key: 'travel deals',
        category_id: CATEGORY_ID,
        active: false,
        tombstoned: true,
      },
    });
    const writer = jest.fn().mockResolvedValue('raw-offer-saved');
    await expect(
      service.withInvolveCategoryAssignment('Travel Deals', writer),
    ).resolves.toBe('raw-offer-saved');
    expect(writer).toHaveBeenCalledWith(
      { categories_normalized: null },
      session,
    );
    expect(categoryModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sourceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('honors a tombstone from every source when an Involve alias is absent', async () => {
    const { service, categoryModel, sourceModel, session } = makeHarness({
      sourceAliases: [
        {
          source: 'legacy',
          source_key: 'travel deals',
          category_id: CATEGORY_ID,
          active: false,
          tombstoned: true,
        },
      ],
    });
    const writer = jest.fn().mockResolvedValue('raw-offer-saved');

    await expect(
      service.withInvolveCategoryAssignment('Travel Deals', writer),
    ).resolves.toBe('raw-offer-saved');
    expect(writer).toHaveBeenCalledWith(
      { categories_normalized: null },
      session,
    );
    expect(categoryModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sourceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('resolves an active retained alias globally for Involve without creating a duplicate category', async () => {
    const { service, categoryModel, sourceModel, session } = makeHarness({
      category: null,
      sourceAliases: [
        {
          source: 'legacy',
          source_key: 'old travel name',
          category_id: ALIAS_CATEGORY_ID,
          active: true,
          tombstoned: false,
        },
      ],
    });
    categoryModel.findOneAndUpdate.mockImplementation(
      (filter: Record<string, unknown>) =>
        query(
          String(filter._id) === String(ALIAS_CATEGORY_ID)
            ? {
                _id: ALIAS_CATEGORY_ID,
                name: 'Travel Deals',
                name_normalized: 'travel deals',
                lifecycle_status: 'active',
                revision: 8,
              }
            : null,
        ),
    );
    const writer = jest.fn().mockResolvedValue('saved');

    await expect(
      service.withInvolveCategoryAssignment('Old Travel Name', writer),
    ).resolves.toBe('saved');

    expect(categoryModel.create).not.toHaveBeenCalled();
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: ALIAS_CATEGORY_ID,
        lifecycle_status: 'active',
      }),
      { $inc: { revision: 1 } },
      expect.objectContaining({ session }),
    );
    expect(writer).toHaveBeenCalledWith(
      { categories_normalized: 'old travel name' },
      session,
    );
    expect(sourceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('CategoryIntegrityService lifecycle commands', () => {
  it.each([
    [
      'request key',
      {
        request_key: { $ne: null } as unknown as string,
        expected_revision: 3,
      },
    ],
    [
      'revision',
      {
        request_key: 'delete-content-1234',
        expected_revision: { $gt: 0 } as unknown as number,
      },
    ],
  ])(
    'rejects an object-valued %s before database access',
    async (_label, dto) => {
      const { service, stateModel, categoryModel, commandModel } =
        makeHarness();

      await expect(
        service.deleteContent(String(CATEGORY_ID), dto),
      ).rejects.toThrow();

      expect(stateModel.findOne).not.toHaveBeenCalled();
      expect(categoryModel.findOne).not.toHaveBeenCalled();
      expect(commandModel.findOne).not.toHaveBeenCalled();
    },
  );

  it('rejects retire with the exact reference counts and no category write', async () => {
    const { service, categoryModel } = makeHarness({
      directIds: ['offer-a'],
      normalizedIds: ['offer-a', 'offer-b'],
    });
    await expect(
      service.retire(String(CATEGORY_ID), {
        request_key: 'retire-category-1234',
        expected_revision: 3,
      }),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({
        code: 'POLICY_CATEGORY_REFERENCED',
        reference_counts: {
          offer_policy_category_id: 1,
          offer_categories_normalized: 2,
          unique_offers: 2,
        },
      }),
    });
    expect(categoryModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('delete-content preserves the category icon fields and clears only policy/default-banner content', async () => {
    const { service, categoryModel, policyModel, commandModel } = makeHarness();
    await service.deleteContent(String(CATEGORY_ID), {
      request_key: 'delete-content-1234',
      expected_revision: 3,
    });
    expect(commandModel.findOne).toHaveBeenNthCalledWith(1, {
      request_key: { $eq: 'delete-content-1234' },
    });
    expect(commandModel.findOne).toHaveBeenNthCalledWith(2, {
      request_key: { $eq: 'delete-content-1234' },
    });
    expect(categoryModel.findOne).toHaveBeenCalledWith({
      _id: { $eq: CATEGORY_ID },
      lifecycle_status: 'active',
      revision: { $eq: 3 },
    });
    expect(policyModel.deleteOne).toHaveBeenCalled();
    expect(categoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $eq: CATEGORY_ID },
        lifecycle_status: 'active',
        revision: { $eq: 3 },
      }),
      expect.objectContaining({
        $unset: expect.objectContaining({
          banner: 1,
          banner_asset: 1,
        }),
        $inc: { revision: 1 },
      }),
      expect.objectContaining({ session: expect.anything() }),
    );
    expect(commandModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        request_key: { $eq: 'delete-content-1234' },
        payload_hash: { $eq: expect.any(String) },
        operation: 'delete-content',
        status: 'processing',
        attempt_token: expect.any(String),
      },
      expect.objectContaining({ $set: expect.any(Object) }),
      expect.objectContaining({ session: expect.anything() }),
    );
    const update = categoryModel.findOneAndUpdate.mock.calls[0][1];
    expect(update.$unset).not.toHaveProperty('icon_key');
    expect(update.$unset).not.toHaveProperty('image');
    expect(update.$unset).not.toHaveProperty('image_asset');
    expect(update.$set).toBeUndefined();
  });

  it('rejects purge until the 30-day retention timestamp has elapsed', async () => {
    const { service } = makeHarness({
      category: {
        _id: CATEGORY_ID,
        name: 'Travel Deals',
        name_normalized: 'travel deals',
        lifecycle_status: 'retired',
        revision: 4,
        purge_after: new Date(Date.now() + 60_000),
      },
    });
    await expect(
      service.purge(String(CATEGORY_ID), {
        request_key: 'purge-category-1234',
        expected_revision: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
