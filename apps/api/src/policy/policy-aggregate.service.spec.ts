import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import {
  PreparedCommandOwnedUpload,
  StoredMediaService,
} from 'src/media/stored-media.service';

import { PolicyAggregateService } from './policy-aggregate.service';
import { PolicyMediaCleanupSchema } from './schemas/policy-media-cleanup.schema';

const CATEGORY_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const request = {
  request_key: 'policy-save-12345678',
  category_name: '  Travel   Deals  ',
  icon_key: 'travel' as const,
  policy: JSON.stringify({
    category_id: '__new__',
    terms: {
      primary_locale: 'th',
      translations: { th: 'ข้อกำหนด' },
    },
    banner: {
      primary_locale: 'th',
      translations: { th: 'ข้อความแบนเนอร์' },
    },
  }),
};

const defaultBanner = {
  originalname: 'default.png',
  mimetype: 'image/png',
  buffer: Buffer.from('default-banner'),
} as Express.Multer.File;

function getPath(value: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function comparable(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (value instanceof Types.ObjectId) return String(value);
  return value;
}

function matches(row: any, filter: any): boolean {
  if (!row) return false;
  for (const [key, expected] of Object.entries(filter ?? {})) {
    if (key === '$or') {
      if (!(expected as any[]).some((part) => matches(row, part))) return false;
      continue;
    }
    if (key === '$and') {
      if (!(expected as any[]).every((part) => matches(row, part)))
        return false;
      continue;
    }
    const actual = getPath(row, key);
    if (
      expected &&
      typeof expected === 'object' &&
      !(expected instanceof Date) &&
      !(expected instanceof Types.ObjectId)
    ) {
      const condition = expected as Record<string, any>;
      if (
        '$eq' in condition &&
        comparable(actual) !== comparable(condition.$eq)
      ) {
        return false;
      }
      if ('$exists' in condition) {
        if ((actual !== undefined) !== Boolean(condition.$exists)) return false;
      }
      if (
        '$ne' in condition &&
        comparable(actual) === comparable(condition.$ne)
      ) {
        return false;
      }
      if (
        '$in' in condition &&
        !(condition.$in as unknown[]).some(
          (item) => comparable(item) === comparable(actual),
        )
      ) {
        return false;
      }
      if (
        '$lte' in condition &&
        Number(comparable(actual)) > Number(comparable(condition.$lte))
      ) {
        return false;
      }
      continue;
    }
    if (comparable(actual) !== comparable(expected)) return false;
  }
  return true;
}

function setPath(target: any, path: string, value: unknown) {
  const parts = path.split('.');
  const leaf = parts.pop() as string;
  const parent = parts.reduce((current, part) => {
    current[part] ??= {};
    return current[part];
  }, target);
  parent[leaf] = value;
}

function unsetPath(target: any, path: string) {
  const parts = path.split('.');
  const leaf = parts.pop() as string;
  const parent = parts.reduce((current, part) => current?.[part], target);
  if (parent) delete parent[leaf];
}

function applyUpdate(row: any, update: any) {
  const next = { ...row };
  for (const [key, value] of Object.entries(update.$set ?? {})) {
    setPath(next, key, value);
  }
  for (const key of Object.keys(update.$unset ?? {})) unsetPath(next, key);
  for (const [key, amount] of Object.entries(update.$inc ?? {})) {
    setPath(next, key, Number(getPath(next, key) ?? 0) + Number(amount));
  }
  return next;
}

function query<T>(value: T) {
  return {
    session: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
}

function listQuery<T>(getValue: () => T[]) {
  const chain = {
    session: jest.fn(),
    limit: jest.fn(),
    lean: jest.fn(async () => getValue()),
  };
  chain.session.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

function makeHarness(
  options: {
    idFactory?: () => Types.ObjectId;
    transactionSupported?: boolean;
  } = {},
) {
  const commands = new Map<string, any>();
  const categories = new Map<string, any>();
  const policies = new Map<string, any>();
  const sources = new Map<string, any>();
  const cleanups: any[] = [];

  const commandModel: any = {
    findOne: jest.fn((filter: any) =>
      query([...commands.values()].find((row) => matches(row, filter)) ?? null),
    ),
    find: jest.fn((filter: any) =>
      listQuery(() =>
        [...commands.values()].filter((row) => matches(row, filter)),
      ),
    ),
    create: jest.fn(async (rows: any[]) => {
      for (const row of rows) {
        if (commands.has(row.request_key)) {
          const error = new Error('duplicate request_key') as Error & {
            code: number;
          };
          error.code = 11000;
          throw error;
        }
        commands.set(row.request_key, { ...row });
      }
      return rows;
    }),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      const current = [...commands.values()].find((row) =>
        matches(row, filter),
      );
      if (!current) return query(null);
      const next = applyUpdate(current, update);
      commands.set(next.request_key, next);
      return query(next);
    }),
  };

  const categoryModel: any = {
    findOne: jest.fn((filter: any) =>
      query(
        [...categories.values()].find((row) => matches(row, filter)) ?? null,
      ),
    ),
    find: jest.fn((filter: any) =>
      query([...categories.values()].filter((row) => matches(row, filter))),
    ),
    create: jest.fn(async (rows: any[]) => {
      for (const row of rows) categories.set(String(row._id), { ...row });
      return rows;
    }),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      const current = [...categories.values()].find((row) =>
        matches(row, filter),
      );
      if (!current) return query(null);
      const next = applyUpdate(current, update);
      categories.set(String(next._id), next);
      return query(next);
    }),
  };

  const policyModel: any = {
    findOne: jest.fn((filter: any) =>
      query([...policies.values()].find((row) => matches(row, filter)) ?? null),
    ),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      let current = [...policies.values()].find((row) => matches(row, filter));
      if (!current && !update.$set && !update.$unset) return query(null);
      current ??= { category_id: filter.category_id };
      const next = applyUpdate(current, update);
      policies.set(String(next.category_id), next);
      return query(next);
    }),
  };

  const sourceModel: any = {
    findOne: jest.fn((filter: any) =>
      query([...sources.values()].find((row) => matches(row, filter)) ?? null),
    ),
    findOneAndUpdate: jest.fn((filter: any, update: any) => {
      const id = String(filter.category_id);
      const current = sources.get(id) ?? update.$setOnInsert ?? {};
      const next = applyUpdate(current, update);
      sources.set(id, next);
      return query(next);
    }),
  };

  const assetFor = (ownerKey: string, attemptToken = 'attempt-a') => ({
    provider: 'r2' as const,
    ownership: 'command-owned' as const,
    owner_key: ownerKey,
    owner_attempt_token: attemptToken,
    url: `https://media.example/categories/${ownerKey}/${attemptToken}/hash.png`,
    bucket: 'media',
    object_key: `categories/${ownerKey}-0123456789abcdef/${attemptToken}-0123456789abcdef/${'a'.repeat(64)}.png`,
    sha256: 'a'.repeat(64),
    original_name: 'default.png',
    content_type: 'image/png',
  });
  const media: jest.Mocked<
    Pick<
      StoredMediaService,
      'prepareCommandOwned' | 'putCommandOwned' | 'deleteCommandOwnedStrict'
    >
  > = {
    prepareCommandOwned: jest.fn(
      async (
        file,
        _folder,
        ownerKey,
        ownerAttemptToken,
      ): Promise<PreparedCommandOwnedUpload> => ({
        asset: assetFor(ownerKey, ownerAttemptToken),
        file,
        access: 'public',
      }),
    ),
    putCommandOwned: jest.fn(
      async (prepared: PreparedCommandOwnedUpload, _timeoutMs: number) =>
        Promise.resolve(prepared.asset),
    ),
    deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
  };

  const session = {
    withTransaction: jest.fn(async (callback: () => Promise<void>) =>
      callback(),
    ),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const connection: any = {
    startSession: jest.fn().mockResolvedValue(session),
    db: {
      admin: jest.fn(() => ({
        command: jest
          .fn()
          .mockResolvedValue(
            options.transactionSupported === false
              ? { isWritablePrimary: true }
              : { setName: 'rs0', logicalSessionTimeoutMinutes: 30 },
          ),
      })),
    },
  };
  const mediaRegistry = {
    registerCommandOwnedInSession: jest.fn().mockResolvedValue({}),
    touchAttachInSession: jest.fn().mockResolvedValue({ tracked: true }),
  };
  const journalCommandOwnedAssets = jest.fn(
    async (input: Record<string, any>) => {
      const created = (input.assets ?? []).map((asset: any) => {
        let row = cleanups.find(
          (candidate) =>
            candidate.request_key === input.request_key &&
            candidate.reason === input.reason &&
            candidate.asset?.object_key === asset.object_key,
        );
        if (!row) {
          row = {
            _id: `cleanup-${cleanups.length + 1}`,
            ...input,
            asset,
            status: 'pending',
            attempts: 0,
          };
          delete row.assets;
          cleanups.push(row);
        }
        return row;
      });
      return created;
    },
  );
  const processRequest = jest.fn(async (requestKey: string) => {
    const pending = cleanups.filter(
      (row) => row.request_key === requestKey && row.status === 'pending',
    );
    let deleted = 0;
    for (const cleanup of pending) {
      const referenced = [...categories.values()].some(
        (category) =>
          category.banner === cleanup.asset.url ||
          category.image === cleanup.asset.url ||
          category.banner_asset?.url === cleanup.asset.url ||
          category.image_asset?.url === cleanup.asset.url ||
          category.banner_asset?.object_key === cleanup.asset.object_key ||
          category.image_asset?.object_key === cleanup.asset.object_key,
      );
      if (referenced) continue;
      const ownerCommand = commands.get(cleanup.request_key);
      if (
        cleanup.reason === 'precommit-failure' &&
        ownerCommand?.status === 'committed'
      ) {
        continue;
      }
      try {
        await media.deleteCommandOwnedStrict(cleanup.asset, 'categories');
        cleanup.status = 'deleted';
        deleted += 1;
      } catch (error) {
        cleanup.last_error =
          error instanceof Error ? error.message : String(error);
      }
    }
    return { deleted, pending: pending.length - deleted };
  });
  const compensateLifecycleCommand = jest.fn(
    async (requestKey: string, compensationToken: string) => {
      const command = commands.get(requestKey);
      if (
        !command ||
        command.status !== 'compensating' ||
        command.compensation_token !== compensationToken
      ) {
        return false;
      }
      const asset = command.planned_asset;
      if (!asset && !command.upload_state) {
        command.status = 'failed';
        delete command.compensation_token;
        delete command.lease_expires_at;
        return true;
      }
      const referenced = [...categories.values()].some(
        (category) =>
          category.banner === asset?.url ||
          category.image === asset?.url ||
          category.banner_asset?.url === asset?.url ||
          category.image_asset?.url === asset?.url ||
          category.banner_asset?.object_key === asset?.object_key ||
          category.image_asset?.object_key === asset?.object_key,
      );
      if (referenced) {
        command.last_error =
          'Policy media is referenced by a category; automatic deletion was refused';
        return false;
      }
      const [cleanup] = await journalCommandOwnedAssets({
        owner_type: 'category',
        owner_id: command.category_id,
        request_key: command.request_key,
        payload_hash: command.payload_hash,
        attempt_token: command.attempt_token,
        reason: 'precommit-failure',
        assets: [asset],
      });
      cleanup.attempts = Number(cleanup.attempts ?? 0) + 1;
      cleanup.worker_token = compensationToken;
      try {
        await media.deleteCommandOwnedStrict(asset, 'categories');
      } catch (error) {
        cleanup.last_error =
          error instanceof Error ? error.message : String(error);
        delete cleanup.worker_token;
        return false;
      }
      const stillOwned = commands.get(requestKey);
      if (
        stillOwned?.status !== 'compensating' ||
        stillOwned.compensation_token !== compensationToken
      ) {
        return false;
      }
      cleanup.status = 'deleted';
      delete cleanup.worker_token;
      stillOwned.status = 'failed';
      delete stillOwned.planned_asset;
      delete stillOwned.upload_state;
      delete stillOwned.compensation_token;
      delete stillOwned.lease_expires_at;
      return true;
    },
  );
  const mediaCleanup = {
    journalCommandOwnedAssets,
    processRequest,
    retryPendingLegacyReplacements: jest.fn(async (limit = 25) => {
      void limit;
      let deleted = 0;
      for (const key of new Set(cleanups.map((row) => row.request_key))) {
        deleted += (await processRequest(key)).deleted;
      }
      return {
        deleted,
        pending: cleanups.filter((row) => row.status === 'pending').length,
      };
    }),
    compensateLifecycleCommand,
  };
  const qaFailureInjection = { consumeOnce: jest.fn().mockReturnValue(false) };
  const categoryIntegrity = {
    assertReady: jest.fn().mockResolvedValue(undefined),
    fenceReady: jest.fn().mockResolvedValue(undefined),
    withIntegrityMutation: jest.fn(async (writer) => {
      let result: unknown;
      await session.withTransaction(async () => {
        await categoryIntegrity.fenceReady(session);
        result = await writer(session);
      });
      return result;
    }),
  };
  const service = new PolicyAggregateService(
    connection,
    categoryModel,
    policyModel,
    commandModel,
    sourceModel,
    media as unknown as StoredMediaService,
    categoryIntegrity as never,
    mediaRegistry as never,
    mediaCleanup as never,
    qaFailureInjection as never,
    options.idFactory ?? (() => CATEGORY_ID),
  );

  return {
    service,
    commands,
    categories,
    policies,
    sources,
    cleanups,
    media,
    session,
    connection,
    commandModel,
    categoryModel,
    policyModel,
    sourceModel,
    assetFor,
    mediaRegistry,
    mediaCleanup,
    qaFailureInjection,
    categoryIntegrity,
  };
}

function expiredCommand(
  h: ReturnType<typeof makeHarness>,
  overrides: Record<string, unknown> = {},
) {
  const row: any = {
    request_key: 'recovery-command',
    payload_hash: 'b'.repeat(64),
    category_id: CATEGORY_ID,
    status: 'processing',
    attempt_token: 'attempt-a',
    lease_expires_at: new Date(Date.now() - 1_000),
    attempts: 1,
    ...overrides,
  };
  h.commands.set(row.request_key, row);
  return row;
}

describe('PolicyAggregateService', () => {
  it('rejects an object-valued request key before transaction or database access', async () => {
    const h = makeHarness();

    await expect(
      h.service.execute({
        ...request,
        request_key: { $ne: null } as unknown as string,
      }),
    ).rejects.toThrow();

    expect(h.connection.db.admin).not.toHaveBeenCalled();
    expect(h.commandModel.findOne).not.toHaveBeenCalled();
    expect(h.commandModel.create).not.toHaveBeenCalled();
  });

  it('fences command claim at write time and creates the initial lease in that session', async () => {
    const h = makeHarness();

    await h.service.execute(request);

    expect(h.commandModel.findOne).toHaveBeenNthCalledWith(1, {
      request_key: { $eq: request.request_key },
    });
    expect(h.commandModel.findOne).toHaveBeenNthCalledWith(2, {
      request_key: { $eq: request.request_key },
    });
    expect(h.categoryIntegrity.withIntegrityMutation).toHaveBeenCalledTimes(1);
    expect(h.commandModel.create).toHaveBeenCalledWith(
      [expect.objectContaining({ request_key: request.request_key })],
      { session: h.session },
    );
  });

  it('creates no command when the migration marker changes after preflight but before claim', async () => {
    const h = makeHarness();
    h.categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
      new ServiceUnavailableException('integrity migration applying'),
    );

    await expect(h.service.execute(request, defaultBanner)).rejects.toThrow(
      'integrity migration applying',
    );

    expect(h.commandModel.create).not.toHaveBeenCalled();
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(h.media.putCommandOwned).not.toHaveBeenCalled();
  });

  it('fails closed before file preparation, command creation, or upload when transactions are unavailable', async () => {
    const h = makeHarness({ transactionSupported: false });
    await expect(
      h.service.execute(request, defaultBanner),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(h.commandModel.create).not.toHaveBeenCalled();
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(h.media.putCommandOwned).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid JSON', { ...request, policy: '{' }],
    [
      'missing required new-policy terms',
      {
        ...request,
        policy: JSON.stringify({
          category_id: '__new__',
          banner: { primary_locale: 'en', translations: { en: 'banner' } },
        }),
      },
    ],
  ])('%s creates no command and performs no upload', async (_label, dto) => {
    const h = makeHarness();
    await expect(h.service.execute(dto, defaultBanner)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(h.commands.size).toBe(0);
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(h.media.putCommandOwned).not.toHaveBeenCalled();
  });

  it('missing existing category creates no command and performs no upload', async () => {
    const h = makeHarness();
    await expect(
      h.service.execute(
        { ...request, category_id: String(CATEGORY_ID) },
        defaultBanner,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.commands.size).toBe(0);
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
  });

  it('duplicate and corrupt legacy identities fail before command creation or upload', async () => {
    const duplicate = makeHarness();
    duplicate.categories.set(String(CATEGORY_ID), {
      _id: CATEGORY_ID,
      name: 'Ｔｒａｖｅｌ　Ｄｅａｌｓ',
      lifecycle_status: 'active',
    });
    await expect(
      duplicate.service.execute(request, defaultBanner),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(duplicate.commands.size).toBe(0);
    expect(duplicate.media.prepareCommandOwned).not.toHaveBeenCalled();

    const corrupt = makeHarness();
    corrupt.categories.set(String(CATEGORY_ID), {
      _id: CATEGORY_ID,
      name: null,
      lifecycle_status: 'active',
    });
    await expect(
      corrupt.service.execute(request, defaultBanner),
    ).rejects.toMatchObject({
      status: 409,
      message:
        'Legacy category identity data is invalid; repair it before saving policies.',
    });
    expect(corrupt.commands.size).toBe(0);
    expect(corrupt.media.prepareCommandOwned).not.toHaveBeenCalled();
  });

  it('a retired source tombstone blocks aggregate recreation before command creation or upload', async () => {
    const h = makeHarness();
    h.sources.set('retired-travel-deals', {
      category_id: CATEGORY_ID,
      source: 'involve',
      source_key: 'travel deals',
      active: false,
      tombstoned: true,
      revision: 2,
    });

    await expect(h.service.execute(request, defaultBanner)).rejects.toThrow(
      'was retired and cannot be recreated',
    );
    expect(h.commands.size).toBe(0);
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(h.media.putCommandOwned).not.toHaveBeenCalled();
  });

  it('a retained active alias blocks name reuse before command creation or upload', async () => {
    const h = makeHarness();
    h.sources.set('prior-travel-deals-alias', {
      category_id: CATEGORY_ID,
      source: 'policy-admin',
      source_key: 'travel deals',
      active: true,
      tombstoned: false,
      revision: 1,
    });

    await expect(h.service.execute(request, defaultBanner)).rejects.toThrow(
      'already belongs to another category',
    );
    expect(h.commands.size).toBe(0);
    expect(h.media.prepareCommandOwned).not.toHaveBeenCalled();
    expect(h.media.putCommandOwned).not.toHaveBeenCalled();
  });

  it('journals planned metadata before Put, confirms it, commits once, and replays', async () => {
    const h = makeHarness();
    h.media.putCommandOwned.mockImplementationOnce(async (prepared) => {
      expect(h.commands.get(request.request_key)).toMatchObject({
        status: 'processing',
        upload_state: 'planned',
        planned_asset: prepared.asset,
      });
      return prepared.asset;
    });

    const first = await h.service.execute(request, defaultBanner);
    const replay = await h.service.execute(request, defaultBanner);

    expect(replay).toEqual(first);
    expect(h.media.prepareCommandOwned).toHaveBeenCalledTimes(1);
    expect(h.media.putCommandOwned).toHaveBeenCalledWith(
      expect.objectContaining({ asset: expect.any(Object) }),
      30_000,
    );
    expect(h.session.withTransaction).toHaveBeenCalledTimes(4);
    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'committed',
      upload_state: 'confirmed',
      attempts: 1,
    });
    expect(first.category).toMatchObject({
      _id: String(CATEGORY_ID),
      name: 'Travel Deals',
      icon_key: 'travel',
      banner_asset: expect.objectContaining({ ownership: 'command-owned' }),
    });
    expect(h.sourceModel.findOneAndUpdate.mock.calls[0][1]).toMatchObject({
      $setOnInsert: { revision: 1, tombstoned: false },
    });
    expect(h.sourceModel.findOneAndUpdate.mock.calls[0][1]).not.toHaveProperty(
      '$inc',
    );
  });

  it.each([
    [
      'filename',
      { ...defaultBanner, originalname: 'renamed.png' } as Express.Multer.File,
    ],
    [
      'MIME type',
      { ...defaultBanner, mimetype: 'image/jpeg' } as Express.Multer.File,
    ],
    [
      'declared size',
      {
        ...defaultBanner,
        size: defaultBanner.buffer.length + 1,
      } as Express.Multer.File,
    ],
  ])(
    'same key and bytes with a different %s conflicts before a second upload or aggregate',
    async (_label, changedFile) => {
      const h = makeHarness();
      const original = {
        ...defaultBanner,
        size: defaultBanner.buffer.length,
      } as Express.Multer.File;
      await h.service.execute(request, original);
      const preparationCalls = h.media.prepareCommandOwned.mock.calls.length;
      const putCalls = h.media.putCommandOwned.mock.calls.length;
      const commandCreates = h.commandModel.create.mock.calls.length;
      const transactionCalls = h.session.withTransaction.mock.calls.length;

      await expect(h.service.execute(request, changedFile)).rejects.toThrow(
        'request_key was already used for a different policy payload',
      );
      expect(h.media.prepareCommandOwned).toHaveBeenCalledTimes(
        preparationCalls,
      );
      expect(h.media.putCommandOwned).toHaveBeenCalledTimes(putCalls);
      expect(h.commandModel.create).toHaveBeenCalledTimes(commandCreates);
      expect(h.session.withTransaction).toHaveBeenCalledTimes(transactionCalls);
    },
  );

  it('response lost after an accepted Put enters compensation and becomes clean failed', async () => {
    const h = makeHarness();
    h.media.putCommandOwned.mockRejectedValueOnce(
      new Error('response lost after accepted Put'),
    );

    await expect(h.service.execute(request, defaultBanner)).rejects.toThrow(
      'response lost after accepted Put',
    );
    expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(1);
    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'failed',
      attempt_token: expect.any(String),
    });
    expect(h.commands.get(request.request_key)).not.toHaveProperty(
      'planned_asset',
    );
    expect(h.commands.get(request.request_key)).not.toHaveProperty(
      'upload_state',
    );

    const retried = await h.service.execute(request, defaultBanner);
    expect(retried.category._id).toBe(String(CATEGORY_ID));
    expect(h.media.prepareCommandOwned).toHaveBeenCalledTimes(2);
    expect(h.media.putCommandOwned).toHaveBeenCalledTimes(2);
    const firstPlan = h.media.putCommandOwned.mock.calls[0][0].asset.object_key;
    const retryPlan = h.media.putCommandOwned.mock.calls[1][0].asset.object_key;
    expect(retryPlan).not.toBe(firstPlan);
    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'committed',
      attempts: 2,
    });
  });

  it('consumes the guarded one-shot failpoint only after Put, compensates, and allows a clean retry', async () => {
    const h = makeHarness();
    const priorEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME;
    const priorSha = process.env.RAILWAY_GIT_COMMIT_SHA;
    process.env.RAILWAY_ENVIRONMENT_NAME = 'staging';
    process.env.RAILWAY_GIT_COMMIT_SHA = 'f'.repeat(40);
    h.qaFailureInjection.consumeOnce.mockReturnValueOnce(true);

    try {
      await expect(h.service.execute(request, defaultBanner)).rejects.toThrow(
        'Controlled policy QA failure after media upload and before database commit',
      );

      expect(h.qaFailureInjection.consumeOnce).toHaveBeenCalledWith({
        environment: 'staging',
        candidate_sha: 'f'.repeat(40),
        request_key: request.request_key,
        failure_point: 'after-media-put-before-db-commit',
      });
      expect(h.media.putCommandOwned.mock.invocationCallOrder[0]).toBeLessThan(
        h.qaFailureInjection.consumeOnce.mock.invocationCallOrder[0],
      );
      expect(h.categories.size).toBe(0);
      expect(h.policies.size).toBe(0);
      expect(h.mediaCleanup.compensateLifecycleCommand).toHaveBeenCalledTimes(
        1,
      );
      expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(1);
      expect(h.commands.get(request.request_key)).toMatchObject({
        status: 'failed',
        attempts: 1,
      });

      const retry = await h.service.execute(request, defaultBanner);

      expect(retry.category._id).toBe(String(CATEGORY_ID));
      expect(h.qaFailureInjection.consumeOnce).toHaveBeenCalledTimes(2);
      expect(h.media.putCommandOwned).toHaveBeenCalledTimes(2);
      expect(h.commands.get(request.request_key)).toMatchObject({
        status: 'committed',
        attempts: 2,
      });
    } finally {
      if (priorEnvironment === undefined) {
        delete process.env.RAILWAY_ENVIRONMENT_NAME;
      } else {
        process.env.RAILWAY_ENVIRONMENT_NAME = priorEnvironment;
      }
      if (priorSha === undefined) {
        delete process.env.RAILWAY_GIT_COMMIT_SHA;
      } else {
        process.env.RAILWAY_GIT_COMMIT_SHA = priorSha;
      }
    }
  });

  it.each(['planned', 'confirmed'] as const)(
    'scheduled recovery cleans a no-retry crash with %s media state',
    async (uploadState) => {
      const h = makeHarness();
      const asset = h.assetFor('recovery-command');
      const row = expiredCommand(h, {
        upload_state: uploadState,
        planned_asset: asset,
      });

      await expect(h.service.recoverExpiredCommands()).resolves.toBe(1);
      expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledWith(
        asset,
        'categories',
      );
      expect(h.commands.get(row.request_key)).toMatchObject({
        status: 'failed',
      });
      expect(h.commands.get(row.request_key)).not.toHaveProperty(
        'planned_asset',
      );
    },
  );

  it('scheduled recovery leaves the command untouched when the durable marker is not ready', async () => {
    const h = makeHarness();
    const asset = h.assetFor('recovery-command');
    const row = expiredCommand(h, {
      upload_state: 'confirmed',
      planned_asset: asset,
    });
    h.categoryIntegrity.withIntegrityMutation.mockRejectedValueOnce(
      new ServiceUnavailableException('integrity migration applying'),
    );

    await expect(h.service.recoverExpiredCommands()).rejects.toThrow(
      'integrity migration applying',
    );

    expect(h.commands.get(row.request_key)).toMatchObject({
      status: 'processing',
      attempt_token: 'attempt-a',
    });
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('delete timeout leaves compensating and a rotated worker retries one tombstone idempotently', async () => {
    const h = makeHarness();
    const asset = h.assetFor('recovery-command');
    const row = expiredCommand(h, {
      upload_state: 'confirmed',
      planned_asset: asset,
    });
    h.media.deleteCommandOwnedStrict
      .mockRejectedValueOnce(new Error('Delete aborted after timeout'))
      .mockResolvedValueOnce(undefined);

    await expect(h.service.recoverExpiredCommands()).resolves.toBe(1);
    expect(h.commands.get(row.request_key)).toMatchObject({
      status: 'compensating',
      compensation_token: expect.any(String),
    });
    const firstWorkerToken = h.commands.get(row.request_key).compensation_token;
    expect(h.cleanups).toHaveLength(1);

    const active = h.commands.get(row.request_key);
    active.lease_expires_at = new Date(Date.now() - 1_000);
    await expect(h.service.recoverExpiredCommands()).resolves.toBe(1);

    expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(2);
    expect(h.media.deleteCommandOwnedStrict).toHaveBeenLastCalledWith(
      asset,
      'categories',
    );
    expect(h.cleanups).toHaveLength(1);
    expect(h.cleanups[0]).toMatchObject({ status: 'deleted', attempts: 2 });
    expect(h.cleanups[0].worker_token).not.toBe(firstWorkerToken);
    expect(h.commands.get(row.request_key)).toMatchObject({ status: 'failed' });
  });

  it('precommit cleanup refuses an asset referenced by another category', async () => {
    const h = makeHarness();
    const asset = h.assetFor('recovery-command');
    expiredCommand(h, {
      upload_state: 'confirmed',
      planned_asset: asset,
    });
    const otherCategoryId = new Types.ObjectId();
    h.categories.set(String(otherCategoryId), {
      _id: otherCategoryId,
      name: 'Shared media reference',
      name_normalized: 'shared media reference',
      lifecycle_status: 'active',
      image_asset: {
        ...asset,
        url: 'https://media.example/a-different-url.png',
      },
    });

    await expect(h.service.recoverExpiredCommands()).resolves.toBe(1);
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    expect(h.commands.get('recovery-command')).toMatchObject({
      status: 'compensating',
      last_error:
        'Policy media is referenced by a category; automatic deletion was refused',
    });
  });

  it('postcommit cleanup refuses an old asset URL referenced by another category', async () => {
    const h = makeHarness();
    const asset = h.assetFor('old-policy-save', 'old-attempt');
    h.commands.set('replacement-command', {
      request_key: 'replacement-command',
      payload_hash: 'c'.repeat(64),
      category_id: CATEGORY_ID,
      status: 'committed',
      attempt_token: 'replacement-attempt',
      attempts: 1,
      response: {
        request_key: 'replacement-command',
        category: {},
        policy: {},
      },
    });
    h.cleanups.push({
      _id: 'cleanup-replacement',
      category_id: CATEGORY_ID,
      request_key: 'replacement-command',
      payload_hash: 'c'.repeat(64),
      attempt_token: 'replacement-attempt',
      reason: 'replaced-after-commit',
      asset,
      status: 'pending',
      attempts: 0,
    });
    const otherCategoryId = new Types.ObjectId();
    h.categories.set(String(otherCategoryId), {
      _id: otherCategoryId,
      name: 'Legacy shared media',
      name_normalized: 'legacy shared media',
      lifecycle_status: 'active',
      banner: asset.url,
    });

    await expect(h.service.retryPendingCleanup()).resolves.toBe(0);
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    expect(h.cleanups[0]).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('scheduled recovery and cleanup skip committed asset references', async () => {
    const h = makeHarness();
    const asset = h.assetFor('committed-command');
    expiredCommand(h, {
      request_key: 'committed-command',
      status: 'committed',
      upload_state: 'confirmed',
      planned_asset: asset,
      response: { request_key: 'committed-command', category: {}, policy: {} },
    });
    h.cleanups.push({
      _id: 'cleanup-committed',
      category_id: CATEGORY_ID,
      request_key: 'committed-command',
      payload_hash: 'b'.repeat(64),
      attempt_token: 'attempt-a',
      reason: 'precommit-failure',
      asset,
      status: 'pending',
      attempts: 0,
    });

    await expect(h.service.recoverExpiredCommands()).resolves.toBe(0);
    await expect(h.service.retryPendingCleanup()).resolves.toBe(0);
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('expired asset-bearing A is compensated before B retries, and stale A catch cannot delete B asset', async () => {
    const h = makeHarness();
    let enterA!: () => void;
    let rejectA!: (error: Error) => void;
    const enteredA = new Promise<void>((resolve) => {
      enterA = resolve;
    });
    const blockedA = new Promise<never>((_resolve, reject) => {
      rejectA = reject;
    });
    h.session.withTransaction
      .mockImplementationOnce(async (callback) => callback())
      .mockImplementationOnce(async (callback) => callback())
      .mockImplementationOnce(async () => {
        enterA();
        await blockedA;
      });

    const workerA = h.service.execute(request, defaultBanner);
    await enteredA;
    const staleAttempt = { ...h.commands.get(request.request_key) };
    h.commands.get(request.request_key).lease_expires_at = new Date(
      Date.now() - 1_000,
    );

    const workerB = await h.service.execute(request, defaultBanner);
    rejectA(new Error('worker A resumed after lease loss'));
    const staleResult = await workerA;

    expect(staleResult).toEqual(workerB);
    expect(staleAttempt.attempt_token).not.toBe(
      h.commands.get(request.request_key).attempt_token,
    );
    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'committed',
      upload_state: 'confirmed',
    });
    expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(1);
    expect(h.media.putCommandOwned).toHaveBeenCalledTimes(2);
    expect(
      h.media.deleteCommandOwnedStrict.mock.invocationCallOrder[0],
    ).toBeLessThan(h.media.putCommandOwned.mock.invocationCallOrder[1]);
  });

  it('stale delete worker A cannot delete or mark C after B recovers and C commits', async () => {
    const h = makeHarness();
    let enterDeleteA!: () => void;
    let resumeDeleteA!: () => void;
    const deleteAEntered = new Promise<void>((resolve) => {
      enterDeleteA = resolve;
    });
    const stalledDeleteA = new Promise<void>((resolve) => {
      resumeDeleteA = resolve;
    });
    h.media.putCommandOwned.mockRejectedValueOnce(
      new Error('response lost after accepted Put'),
    );
    h.media.deleteCommandOwnedStrict
      .mockImplementationOnce(async () => {
        enterDeleteA();
        await stalledDeleteA;
      })
      .mockResolvedValueOnce(undefined);

    const workerA = h.service.execute(request, defaultBanner);
    await deleteAEntered;
    const commandDuringA = h.commands.get(request.request_key);
    const attemptA = commandDuringA.attempt_token;
    const compensationA = commandDuringA.compensation_token;
    const assetA = commandDuringA.planned_asset;
    commandDuringA.lease_expires_at = new Date(Date.now() - 1_000);

    await expect(h.service.recoverExpiredCommands()).resolves.toBe(1);
    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'failed',
      attempt_token: attemptA,
    });
    expect(h.cleanups[0].worker_token).not.toBe(compensationA);

    const responseC = await h.service.execute(request, defaultBanner);
    const commandC = h.commands.get(request.request_key);
    const assetC = commandC.planned_asset;
    expect(commandC).toMatchObject({
      status: 'committed',
      attempt_token: expect.any(String),
    });
    expect(commandC.attempt_token).not.toBe(attemptA);
    expect(assetC.object_key).not.toBe(assetA.object_key);
    expect(responseC.category).toMatchObject({
      banner_asset: expect.objectContaining({
        object_key: assetC.object_key,
        owner_attempt_token: commandC.attempt_token,
      }),
    });

    resumeDeleteA();
    await expect(workerA).rejects.toThrow('response lost after accepted Put');

    expect(h.commands.get(request.request_key)).toMatchObject({
      status: 'committed',
      attempt_token: commandC.attempt_token,
      planned_asset: expect.objectContaining({ object_key: assetC.object_key }),
    });
    expect(h.categories.get(String(CATEGORY_ID))).toMatchObject({
      banner_asset: expect.objectContaining({ object_key: assetC.object_key }),
    });
    expect(h.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(2);
    expect(
      h.media.deleteCommandOwnedStrict.mock.calls.every(
        ([asset]) =>
          asset.provider === 'r2' && asset.object_key === assetA.object_key,
      ),
    ).toBe(true);
  });

  it('a stale worker that loses the processing fence performs no delete or fail update', async () => {
    const h = makeHarness();
    const row = expiredCommand(h, {
      upload_state: 'confirmed',
      planned_asset: h.assetFor('recovery-command'),
    });
    const staleFence = { ...row };
    row.attempt_token = 'attempt-b';
    row.status = 'committed';
    row.response = { request_key: row.request_key, category: {}, policy: {} };

    const transition = await (h.service as any).beginCompensation(
      staleFence,
      new Error('late catch'),
    );
    expect(transition).toBeNull();
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
    expect(h.commands.get(row.request_key)).toMatchObject({
      status: 'committed',
      attempt_token: 'attempt-b',
    });
  });

  it('returns committed response after an unknown commit result without compensation', async () => {
    const h = makeHarness();
    h.session.withTransaction
      .mockImplementationOnce(async (callback: () => Promise<void>) =>
        callback(),
      )
      .mockImplementationOnce(async (callback: () => Promise<void>) =>
        callback(),
      )
      .mockImplementationOnce(async (callback: () => Promise<void>) =>
        callback(),
      )
      .mockImplementationOnce(async (callback: () => Promise<void>) => {
        await callback();
        throw new ServiceUnavailableException('unknown commit result');
      });

    const response = await h.service.execute(request, defaultBanner);
    expect(response.category._id).toBe(String(CATEGORY_ID));
    expect(h.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('rechecks policy presence inside the transaction before a banner-only edit', async () => {
    const h = makeHarness();
    h.categories.set(String(CATEGORY_ID), {
      _id: CATEGORY_ID,
      name: 'Travel Deals',
      name_normalized: 'travel deals',
      lifecycle_status: 'active',
    });
    h.policies.set(String(CATEGORY_ID), {
      category_id: CATEGORY_ID,
      terms: { primary_locale: 'th', translations: { th: 'old terms' } },
    });
    h.session.withTransaction.mockImplementationOnce(
      async (callback: () => Promise<void>) => {
        h.policies.delete(String(CATEGORY_ID));
        await callback();
      },
    );
    const bannerOnly = {
      ...request,
      category_id: String(CATEGORY_ID),
      policy: JSON.stringify({
        category_id: String(CATEGORY_ID),
        banner: {
          primary_locale: 'th',
          translations: { th: 'new banner' },
        },
      }),
    };

    await expect(h.service.execute(bannerOnly)).rejects.toThrow(
      'Terms & conditions are required for a new policy.',
    );
  });

  it('defines one exact unique cleanup fence per request, payload, attempt, reason, and object', () => {
    expect(PolicyMediaCleanupSchema.indexes()).toContainEqual([
      {
        request_key: 1,
        payload_hash: 1,
        attempt_token: 1,
        reason: 1,
        'asset.object_key': 1,
      },
      expect.objectContaining({ unique: true }),
    ]);
  });
});
