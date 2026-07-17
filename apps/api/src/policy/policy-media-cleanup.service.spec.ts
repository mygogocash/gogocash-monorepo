import { Types } from 'mongoose';

import { CommandOwnedStoredMediaAsset } from 'src/media/stored-media.service';

import { PolicyMediaCleanupService } from './policy-media-cleanup.service';

const OWNER_ID = new Types.ObjectId('507f1f77bcf86cd799439011');
const ASSET: CommandOwnedStoredMediaAsset = {
  provider: 'r2',
  ownership: 'command-owned',
  owner_key: 'aggregate-create-1',
  owner_attempt_token: 'aggregate-attempt-1',
  url: 'https://media.example/categories/owned.png',
  bucket: 'media',
  object_key: `categories/aggregate-create-1/aggregate-attempt-1/${'a'.repeat(64)}.png`,
  sha256: 'a'.repeat(64),
  original_name: 'owned.png',
  content_type: 'image/png',
};

function query<T>(value: T) {
  return {
    session: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function matches(row: Record<string, any>, filter: Record<string, any>) {
  return Object.entries(filter).every(([key, expected]) => {
    const literalExpected =
      expected && typeof expected === 'object' && '$eq' in expected
        ? expected.$eq
        : expected;
    if (key === 'reconciliation_required') {
      return expected?.$ne === true ? row[key] !== true : row[key] === expected;
    }
    if (key === 'reason' && expected?.$in) {
      return expected.$in.includes(row.reason);
    }
    if (key === 'status' && expected?.$in) {
      return expected.$in.includes(row.status);
    }
    if (key.startsWith('asset.')) {
      return row.asset?.[key.slice(6)] === literalExpected;
    }
    if (literalExpected instanceof Types.ObjectId)
      return String(row[key]) === String(literalExpected);
    return row[key] === literalExpected;
  });
}

function makeHarness() {
  const rows: Record<string, any>[] = [];
  const session = {
    withTransaction: jest.fn(async (writer: () => Promise<void>) => writer()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const cleanupModel: any = {
    find: jest.fn((filter: Record<string, any>) =>
      query(rows.filter((row) => matches(row, filter))),
    ),
    findOne: jest.fn((filter: Record<string, any>) =>
      query(rows.find((row) => matches(row, filter)) ?? null),
    ),
    findOneAndUpdate: jest.fn(
      (filter: Record<string, any>, update: Record<string, any>) => {
        let row = rows.find((candidate) => matches(candidate, filter));
        if (!row && update.$setOnInsert) {
          row = { _id: new Types.ObjectId(), ...update.$setOnInsert };
          rows.push(row);
        }
        if (row) {
          Object.assign(row, update.$set ?? {});
          for (const [key, amount] of Object.entries(update.$inc ?? {})) {
            row[key] = Number(row[key] ?? 0) + Number(amount);
          }
          for (const key of Object.keys(update.$unset ?? {})) delete row[key];
        }
        return query(row ?? null);
      },
    ),
  };
  const lifecycleCommandModel: any = {
    findOne: jest.fn(() => query(null)),
    findOneAndUpdate: jest.fn(() => query(null)),
  };
  const writeCommandModel: any = {
    findOne: jest.fn(() => query(null)),
    findOneAndUpdate: jest.fn(() => query(null)),
  };
  const media = {
    deleteCommandOwnedStrict: jest.fn().mockResolvedValue(undefined),
  };
  const registry = {
    beginDeleteInSession: jest.fn().mockResolvedValue({
      claimed: true,
      delete_token: 'delete-token-1',
      registry: { state: 'deleting' },
      references: { categories: 0, offers: 0, brands: 0, total: 0 },
    }),
    finalizeDeleted: jest.fn().mockResolvedValue(true),
    failDelete: jest.fn().mockResolvedValue(true),
  };
  const integrityFence = {
    assertReady: jest.fn().mockResolvedValue(undefined),
    withIntegrityMutation: jest.fn(async (writer) => writer(session)),
  };
  const service = new PolicyMediaCleanupService(
    cleanupModel,
    lifecycleCommandModel,
    writeCommandModel,
    media as never,
    registry as never,
    integrityFence as never,
  );
  return {
    service,
    rows,
    session,
    cleanupModel,
    lifecycleCommandModel,
    writeCommandModel,
    media,
    registry,
    integrityFence,
  };
}

async function journalOwned(
  harness: ReturnType<typeof makeHarness>,
  reason:
    | 'legacy-category-replaced'
    | 'precommit-failure' = 'legacy-category-replaced',
) {
  await harness.service.journalCommandOwnedAssets(
    {
      owner_type: 'category',
      owner_id: OWNER_ID,
      request_key: 'cleanup-request-1',
      payload_hash: 'b'.repeat(64),
      attempt_token: 'cleanup-attempt-1',
      reason,
      assets: [ASSET],
    },
    harness.session as never,
  );
  return harness.rows[0]!;
}

describe('PolicyMediaCleanupService', () => {
  it('rejects an object-valued journal key before querying MongoDB', async () => {
    const harness = makeHarness();

    await expect(
      harness.service.journalCommandOwnedAssets(
        {
          owner_type: 'category',
          owner_id: OWNER_ID,
          request_key: { $ne: null } as unknown as string,
          payload_hash: 'b'.repeat(64),
          attempt_token: 'cleanup-attempt-1',
          reason: 'precommit-failure',
          assets: [ASSET],
        },
        harness.session as never,
      ),
    ).rejects.toThrow();

    expect(harness.cleanupModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('uses literal equality operators for the complete cleanup identity', async () => {
    const harness = makeHarness();

    await journalOwned(harness, 'precommit-failure');

    expect(harness.cleanupModel.findOneAndUpdate).toHaveBeenCalledWith(
      {
        request_key: { $eq: 'cleanup-request-1' },
        payload_hash: { $eq: 'b'.repeat(64) },
        attempt_token: { $eq: 'cleanup-attempt-1' },
        reason: { $eq: 'precommit-failure' },
        'asset.object_key': { $eq: ASSET.object_key },
      },
      expect.objectContaining({ $setOnInsert: expect.any(Object) }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('journals legacy URLs but quarantines them without registry or storage deletion', async () => {
    const harness = makeHarness();
    await harness.service.journalLegacyReplacements(
      {
        owner_type: 'offer',
        owner_id: OWNER_ID,
        request_key: 'legacy-request-1',
        attempt_token: 'legacy-attempt-1',
        reason: 'offer-replaced',
        references: [' https://legacy.example/logo.png '],
      },
      harness.session as never,
    );

    await expect(
      harness.service.processRequest('legacy-request-1'),
    ).resolves.toEqual({ deleted: 0, pending: 1 });
    expect(harness.rows[0]).toMatchObject({
      reconciliation_required: true,
      asset: {
        provider: 'legacy-unverified',
        url: 'https://legacy.example/logo.png',
      },
    });
    expect(harness.registry.beginDeleteInSession).not.toHaveBeenCalled();
    expect(harness.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('keeps compatibility uncertain-upload rows outside the automatic worker', async () => {
    const harness = makeHarness();
    await harness.service.journalUncertainUploads({
      owner_type: 'offer',
      owner_id: OWNER_ID,
      request_key: 'uncertain-request-1',
      attempt_token: 'uncertain-attempt-1',
      references: ['https://media.example/uncertain.png'],
    });
    expect(harness.rows[0]).toMatchObject({
      reason: 'ambiguous-upload',
      reconciliation_required: true,
      status: 'pending',
    });
    await expect(
      harness.service.processRequest('uncertain-request-1'),
    ).resolves.toEqual({ deleted: 0, pending: 0 });
  });

  it('deletes only after proving the original owner and claiming the registry fence', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.lifecycleCommandModel.findOne.mockReturnValue(
      query({
        request_key: ASSET.owner_key,
        attempt_token: ASSET.owner_attempt_token,
        status: 'committed',
        planned_asset: ASSET,
      }),
    );

    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({ deleted: 1, pending: 0 });
    expect(harness.lifecycleCommandModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        request_key: ASSET.owner_key,
        attempt_token: ASSET.owner_attempt_token,
        'planned_asset.object_key': ASSET.object_key,
      }),
    );
    expect(harness.registry.beginDeleteInSession).toHaveBeenCalledWith(
      ASSET.url,
      harness.session,
    );
    expect(harness.media.deleteCommandOwnedStrict).toHaveBeenCalledWith(
      ASSET,
      'categories',
    );
    expect(harness.registry.finalizeDeleted).toHaveBeenCalledWith(
      ASSET.url,
      'delete-token-1',
      harness.session,
    );
    expect(row.status).toBe('deleted');
  });

  it('refuses deletion when the original owner command cannot be proven', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({ deleted: 0, pending: 1 });
    expect(row.last_error).toContain('original media owner command');
    expect(harness.registry.beginDeleteInSession).not.toHaveBeenCalled();
  });

  it('fails closed before selecting, claiming, or deleting cleanup work', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.integrityFence.assertReady.mockRejectedValueOnce(
      new Error('integrity migration is not ready'),
    );

    await expect(
      harness.service.processRequest(row.request_key),
    ).rejects.toThrow('integrity migration is not ready');
    expect(harness.cleanupModel.find).not.toHaveBeenCalled();
    expect(harness.registry.beginDeleteInSession).not.toHaveBeenCalled();
    expect(harness.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('retains a row when the registry reports a concurrent Brand reference', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.lifecycleCommandModel.findOne.mockReturnValue(
      query({ status: 'committed' }),
    );
    harness.registry.beginDeleteInSession.mockResolvedValue({
      claimed: false,
      reason: 'referenced',
      references: { categories: 0, offers: 0, brands: 1, total: 1 },
    });
    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({ deleted: 0, pending: 1 });
    expect(row.last_error).toContain('globally referenced (1)');
    expect(harness.media.deleteCommandOwnedStrict).not.toHaveBeenCalled();
  });

  it('durably releases both fences when strict storage deletion fails', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.lifecycleCommandModel.findOne.mockReturnValue(
      query({ status: 'committed' }),
    );
    harness.media.deleteCommandOwnedStrict.mockRejectedValueOnce(
      new Error('R2 unavailable'),
    );
    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({ deleted: 0, pending: 1 });
    expect(harness.registry.failDelete).toHaveBeenCalledWith(
      ASSET.url,
      'delete-token-1',
      expect.objectContaining({ message: 'R2 unavailable' }),
      harness.session,
    );
    expect(row.last_error).toBe('R2 unavailable');
    expect(row.worker_token).toBeUndefined();
  });

  it('reclaims a released cleanup row and completes it exactly once on retry', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.lifecycleCommandModel.findOne.mockReturnValue(
      query({ status: 'committed' }),
    );
    harness.media.deleteCommandOwnedStrict
      .mockRejectedValueOnce(new Error('transient R2 failure'))
      .mockResolvedValueOnce(undefined);

    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({
      deleted: 0,
      pending: 1,
    });
    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({
      deleted: 1,
      pending: 0,
    });
    expect(row.status).toBe('deleted');
    expect(harness.registry.beginDeleteInSession).toHaveBeenCalledTimes(2);
    expect(harness.media.deleteCommandOwnedStrict).toHaveBeenCalledTimes(2);
  });

  it('leaves cleanup retryable when the integrity marker flips before finalization', async () => {
    const harness = makeHarness();
    const row = await journalOwned(harness);
    harness.lifecycleCommandModel.findOne.mockReturnValue(
      query({ status: 'committed' }),
    );
    harness.integrityFence.withIntegrityMutation
      .mockImplementationOnce(async (writer) => writer(harness.session))
      .mockRejectedValueOnce(new Error('migration marker changed'))
      .mockImplementationOnce(async (writer) => writer(harness.session));

    await expect(
      harness.service.processRequest(row.request_key),
    ).resolves.toEqual({
      deleted: 0,
      pending: 1,
    });
    expect(row.status).toBe('pending');
    expect(row.worker_token).toBeUndefined();
    expect(harness.registry.failDelete).toHaveBeenCalled();
  });

  it('journals generic precommit plans under the exact compensating command before cleanup', async () => {
    const harness = makeHarness();
    harness.writeCommandModel.findOne.mockReturnValue(
      query({
        request_key: 'offer-write-1',
        payload_hash: 'c'.repeat(64),
        owner_type: 'offer',
        owner_id: OWNER_ID,
        status: 'compensating',
        compensation_token: 'comp-token-1',
        attempt_token: ASSET.owner_attempt_token,
        planned_assets: [{ role: 'logo', folder: 'brands', asset: ASSET }],
      }),
    );
    harness.writeCommandModel.findOneAndUpdate.mockReturnValue(
      query({ status: 'failed' }),
    );
    harness.writeCommandModel.findOne
      .mockReturnValueOnce(
        query({
          request_key: 'offer-write-1',
          payload_hash: 'c'.repeat(64),
          owner_type: 'offer',
          owner_id: OWNER_ID,
          status: 'compensating',
          compensation_token: 'comp-token-1',
          attempt_token: ASSET.owner_attempt_token,
          planned_assets: [{ role: 'logo', folder: 'brands', asset: ASSET }],
        }),
      )
      .mockReturnValue(query({ status: 'compensating' }));

    await expect(
      harness.service.compensateMediaWriteCommand(
        'offer-write-1',
        'comp-token-1',
      ),
    ).resolves.toBe(true);
    expect(harness.rows[0]).toMatchObject({
      request_key: 'offer-write-1',
      reason: 'precommit-failure',
      owner_type: 'offer',
      asset: expect.objectContaining({ object_key: ASSET.object_key }),
    });
  });
});
