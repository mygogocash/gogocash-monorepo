/* eslint-disable @typescript-eslint/no-require-imports */

import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const {
  REVIEWED_PRODUCTION_ATLAS_FINGERPRINT,
  assertPolicyCategoryIntegrityApplyGate,
  describeMongoTarget,
  loadWriterDrainEvidence,
  planMigration,
  policyMediaUrlHash,
  runPolicyCategoryIntegrityMigration,
} = require('../../scripts/policy-category-integrity-migration.cjs');

function commandOwnedAsset(
  url = 'https://media.example/policy/icon.png',
  overrides: Record<string, unknown> = {},
) {
  return {
    provider: 'r2',
    ownership: 'command-owned',
    owner_key: 'policy-save-1',
    owner_attempt_token: 'attempt-1',
    url,
    bucket: 'media',
    object_key: `categories/policy-save-1/attempt-1/${'a'.repeat(64)}.png`,
    sha256: 'a'.repeat(64),
    original_name: 'icon.png',
    content_type: 'image/png',
    ...overrides,
  };
}

function mediaWriteProof(input: {
  ownerType: 'category' | 'offer';
  ownerId: string;
  role: 'image' | 'logo' | 'banner';
  asset: ReturnType<typeof commandOwnedAsset>;
  status?: string;
  uploadState?: string;
  id?: string;
}) {
  const suffix = `:${input.role}`;
  const ownerKey = String(input.asset.owner_key);
  if (!ownerKey.endsWith(suffix)) {
    throw new Error(`test asset owner_key must end with ${suffix}`);
  }
  return {
    _id: input.id ?? `${input.ownerType}-${input.role}-proof`,
    request_key: ownerKey.slice(0, -suffix.length),
    payload_hash: 'f'.repeat(64),
    owner_type: input.ownerType,
    owner_id: input.ownerId,
    operation:
      input.ownerType === 'category' ? 'category-update' : 'offer-update',
    status: input.status ?? 'committed',
    attempt_token: input.asset.owner_attempt_token,
    planned_assets: [
      {
        role: input.role,
        folder: input.ownerType === 'category' ? 'categories' : 'brands',
        asset: input.asset,
        upload_state: input.uploadState ?? 'confirmed',
      },
    ],
  };
}

function lifecycleProof(input: {
  categoryId: string;
  asset: ReturnType<typeof commandOwnedAsset>;
  status?: string;
  uploadState?: string;
  id?: string;
}) {
  return {
    _id: input.id ?? 'category-banner-lifecycle-proof',
    request_key: input.asset.owner_key,
    payload_hash: 'e'.repeat(64),
    category_id: input.categoryId,
    operation: 'aggregate-save',
    status: input.status ?? 'committed',
    attempt_token: input.asset.owner_attempt_token,
    planned_asset: input.asset,
    upload_state: input.uploadState ?? 'confirmed',
  };
}

function makeDb() {
  const writes: string[] = [];
  const updates: Array<{
    name: string;
    filter: Record<string, any>;
    update: Record<string, any>;
  }> = [];
  const collections = new Map<string, any>();
  const rows: Record<string, any[]> = {
    categories: [
      {
        _id: '507f1f77bcf86cd799439011',
        name: '  Travel   Deals ',
      },
    ],
    offers: [
      {
        _id: '507f1f77bcf86cd799439012',
        categories: 'TRAVEL DEALS',
        policy_category_id: '507f1f77bcf86cd799439011',
      },
    ],
    policy_category_sources: [],
    policy_integrity_states: [],
    policies: [],
    policy_lifecycle_commands: [],
    policy_media_cleanup: [],
    policy_media_asset_registry: [],
    policy_media_write_commands: [],
  };

  for (const [name, data] of Object.entries(rows)) {
    collections.set(name, {
      find: jest.fn(() => ({ toArray: jest.fn().mockResolvedValue(data) })),
      findOne: jest.fn().mockImplementation(async () => data[0] ?? null),
      indexes: jest.fn().mockResolvedValue([{ name: '_id_', key: { _id: 1 } }]),
      bulkWrite: jest.fn(async () => {
        writes.push(`${name}:bulkWrite`);
        return { modifiedCount: 1, upsertedCount: 0 };
      }),
      createIndex: jest.fn(async (_key: unknown, options: { name: string }) => {
        writes.push(`${name}:createIndex:${options.name}`);
        return options.name;
      }),
      dropIndex: jest.fn(async (index: string) => {
        writes.push(`${name}:dropIndex:${index}`);
      }),
      updateOne: jest.fn(async (filter, update) => {
        writes.push(`${name}:updateOne`);
        updates.push({ name, filter, update });
        return { modifiedCount: 1 };
      }),
    });
  }

  return {
    db: {
      collection: (name: string) => collections.get(name),
      admin: () => ({
        command: jest.fn().mockResolvedValue({
          setName: 'rs0',
          logicalSessionTimeoutMinutes: 30,
        }),
      }),
    },
    writes,
    updates,
    collections,
    rows,
  };
}

describe('policy category integrity migration', () => {
  it('loads and hashes one bounded regular evidence file but refuses symlinks', () => {
    const directory = mkdtempSync(join(tmpdir(), 'policy-writer-drain-'));
    const evidencePath = join(directory, 'evidence.json');
    const symlinkPath = join(directory, 'evidence-link.json');
    try {
      writeFileSync(evidencePath, '{"schema":"test"}\n', { mode: 0o600 });
      symlinkSync(evidencePath, symlinkPath);

      expect(loadWriterDrainEvidence(evidencePath)).toMatchObject({
        evidence: { schema: 'test' },
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(() => loadWriterDrainEvidence(symlinkPath)).toThrow(
        'non-symlink regular file',
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('binds apply authorization to evidence that every writer is drained', () => {
    const target = describeMongoTarget(
      'mongodb://mongo-dev.internal:27017/gogocash-dev?replicaSet=rs0',
    );
    const candidateSha = 'a'.repeat(40);
    const evidenceSha256 = 'b'.repeat(64);
    const writerDrainEvidence = {
      schema: 'gogocash-policy-writer-drain-v1',
      environment: 'dev',
      candidate_sha: candidateSha,
      target_fingerprint: target.fingerprint,
      recorded_at: new Date().toISOString(),
      ingress: 'blocked',
      inflight_requests: 0,
      background_jobs: 'stopped',
      writer_deployments: [
        {
          service: 'gogocash-api',
          deployment_sha: 'c'.repeat(40),
          replicas: 0,
          state: 'stopped',
        },
      ],
    };
    const baseEnv = {
      POLICY_CATEGORY_INTEGRITY_APPLY: '1',
      POLICY_CATEGORY_INTEGRITY_ENVIRONMENT: 'dev',
      POLICY_CATEGORY_INTEGRITY_TARGET_FINGERPRINT: target.fingerprint,
      POLICY_CATEGORY_INTEGRITY_CANDIDATE_SHA: candidateSha,
      POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256: evidenceSha256,
      POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM: `drained-all-writers:dev:${candidateSha}:${target.fingerprint}:${evidenceSha256}`,
      POLICY_CATEGORY_INTEGRITY_CONFIRM: `apply-category-integrity-v2:dev:${candidateSha}:gogocash-dev:${target.fingerprint}`,
    };

    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        baseEnv,
        writerDrainEvidence,
        evidenceSha256,
      ),
    ).not.toThrow();
    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        {
          ...baseEnv,
          POLICY_CATEGORY_INTEGRITY_CANDIDATE_SHA: '',
        },
        writerDrainEvidence,
        evidenceSha256,
      ),
    ).toThrow('candidate SHA');
    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        {
          ...baseEnv,
          POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM:
            'drained-all-writers:dev:stale:target:evidence',
        },
        writerDrainEvidence,
        evidenceSha256,
      ),
    ).toThrow('writer-drain');
    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        baseEnv,
        { ...writerDrainEvidence, inflight_requests: 1 },
        evidenceSha256,
      ),
    ).toThrow('zero in-flight');
    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        baseEnv,
        {
          ...writerDrainEvidence,
          writer_deployments: [
            {
              ...writerDrainEvidence.writer_deployments[0],
              replicas: 1,
              state: 'running',
            },
          ],
        },
        evidenceSha256,
      ),
    ).toThrow('stopped writer deployments');
  });

  it('production apply > requires reviewed Atlas fingerprint + authorize sentinel (#407)', () => {
    const target = describeMongoTarget(
      'mongodb+srv://operator:secret@gogocash.4prpd9j.mongodb.net/gogocash?retryWrites=true',
    );
    expect(target.fingerprint).toBe(REVIEWED_PRODUCTION_ATLAS_FINGERPRINT);
    const candidateSha = 'd'.repeat(40);
    const evidenceSha256 = 'e'.repeat(64);
    const writerDrainEvidence = {
      schema: 'gogocash-policy-writer-drain-v1',
      environment: 'production',
      candidate_sha: candidateSha,
      target_fingerprint: target.fingerprint,
      recorded_at: new Date().toISOString(),
      ingress: 'blocked',
      inflight_requests: 0,
      background_jobs: 'stopped',
      writer_deployments: [
        {
          service: 'gogocash-api',
          deployment_sha: 'f'.repeat(40),
          replicas: 0,
          state: 'stopped',
        },
      ],
    };
    const baseEnv = {
      POLICY_CATEGORY_INTEGRITY_APPLY: '1',
      POLICY_CATEGORY_INTEGRITY_ENVIRONMENT: 'production',
      POLICY_CATEGORY_INTEGRITY_TARGET_FINGERPRINT: target.fingerprint,
      POLICY_CATEGORY_INTEGRITY_CANDIDATE_SHA: candidateSha,
      POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256: evidenceSha256,
      POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM: `drained-all-writers:production:${candidateSha}:${target.fingerprint}:${evidenceSha256}`,
      POLICY_CATEGORY_INTEGRITY_CONFIRM: `apply-category-integrity-v2:production:${candidateSha}:gogocash:${target.fingerprint}`,
      POLICY_CATEGORY_INTEGRITY_PRODUCTION_AUTHORIZE: `authorize-production-integrity-v2:${candidateSha}:${target.fingerprint}`,
    };

    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        baseEnv,
        writerDrainEvidence,
        evidenceSha256,
      ),
    ).not.toThrow();

    // Staging env must never apply against the reviewed Atlas fingerprint.
    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        {
          ...baseEnv,
          POLICY_CATEGORY_INTEGRITY_ENVIRONMENT: 'staging',
          POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM: `drained-all-writers:staging:${candidateSha}:${target.fingerprint}:${evidenceSha256}`,
          POLICY_CATEGORY_INTEGRITY_CONFIRM: `apply-category-integrity-v2:staging:${candidateSha}:gogocash:${target.fingerprint}`,
        },
        { ...writerDrainEvidence, environment: 'staging' },
        evidenceSha256,
      ),
    ).toThrow('refuses a production target');

    expect(() =>
      assertPolicyCategoryIntegrityApplyGate(
        target,
        {
          ...baseEnv,
          POLICY_CATEGORY_INTEGRITY_PRODUCTION_AUTHORIZE: '',
        },
        writerDrainEvidence,
        evidenceSha256,
      ),
    ).toThrow('PRODUCTION_AUTHORIZE');
  });

  it('derives a credential-free target fingerprint and exposes implicit database risk', () => {
    expect(
      describeMongoTarget(
        'mongodb://operator:secret@mongo-staging.internal:27017/gogocash-staging?replicaSet=rs0',
      ),
    ).toMatchObject({
      host: 'mongo-staging.internal:27017',
      database: 'gogocash-staging',
      sanitized: 'mongodb://mongo-staging.internal:27017/gogocash-staging',
      fingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
    });
    expect(
      describeMongoTarget('mongodb://mongo-staging.internal:27017').database,
    ).toBe('');
  });

  it('is provably zero-write in dry-run mode and returns reviewable counts', async () => {
    const { db, writes } = makeDb();
    const result = await runPolicyCategoryIntegrityMigration({
      db,
      mode: 'dry-run',
    });
    expect(writes).toEqual([]);
    expect(result).toMatchObject({
      mode: 'dry-run',
      counts: {
        categories_scanned: 1,
        offers_scanned: 1,
        categories_to_backfill: 1,
        offers_to_backfill: 1,
      },
      quarantine: [],
    });
  });

  it('applies idempotent backfills/indexes and writes the ready marker last', async () => {
    const { db, writes, updates } = makeDb();
    await runPolicyCategoryIntegrityMigration({ db, mode: 'apply' });
    expect(writes).toContain('categories:bulkWrite');
    expect(writes).toContain('offers:bulkWrite');
    expect(writes).toContain(
      'policy_category_sources:createIndex:policy_category_source_identity_v2',
    );
    expect(writes).toContain(
      'policy_media_asset_registry:createIndex:policy_media_asset_registry_url_hash_v1',
    );
    expect(writes).toContain(
      'policy_media_asset_registry:createIndex:policy_media_asset_registry_state_lease_v1',
    );
    expect(writes).toContain(
      'policy_media_write_commands:createIndex:request_key_1',
    );
    expect(writes).toContain(
      'policy_media_write_commands:createIndex:planned_asset_owner_1_attempt_1_object_1',
    );
    expect(writes[writes.length - 1]).toBe('policy_integrity_states:updateOne');
    expect(
      updates
        .filter((entry) => entry.name === 'policy_integrity_states')
        .map((entry) => entry.update.$set.status),
    ).toEqual(['applying', 'ready']);
  });

  it('quarantines invalid or duplicate durable media-write request identities', () => {
    const result = planMigration({
      categories: [],
      offers: [],
      sources: [],
      registry: [],
      mediaWriteCommands: [
        { _id: 'write-a', request_key: 'media-write-request-1' },
        { _id: 'write-b', request_key: 'media-write-request-1' },
        { _id: 'write-blank', request_key: '   ' },
      ],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'duplicate-media-write-request-key',
          request_key: 'media-write-request-1',
        }),
        expect.objectContaining({
          kind: 'invalid-media-write-request-key',
          command_id: 'write-blank',
        }),
      ]),
    );
    expect(result.counts.media_write_commands_scanned).toBe(3);
  });

  it('tracks a category structured asset only when its exact committed media-write command proves the field', () => {
    const tracked = commandOwnedAsset(
      ' https://media.example/Policy/Icon.PNG?version=A ',
      { owner_key: 'category-media-proof:image' },
    );
    const result = planMigration({
      categories: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Travel Deals',
          lifecycle_status: 'active',
          revision: 1,
          image: tracked.url,
          image_asset: tracked,
          banner: 'https://legacy.example/category-banner.png',
          banner_asset: {
            provider: 'legacy-unverified',
            ownership: 'legacy-unverified',
            url: 'https://legacy.example/category-banner.png',
          },
        },
      ],
      offers: [
        {
          _id: 'offer-string-only-media',
          logo: 'https://legacy.example/offer-logo.png',
          banner: 'https://legacy.example/offer-banner.png',
          categories_normalized: null,
        },
      ],
      sources: [],
      registry: [],
      mediaWriteCommands: [
        mediaWriteProof({
          ownerType: 'category',
          ownerId: '507f1f77bcf86cd799439011',
          role: 'image',
          asset: tracked,
        }),
      ],
      lifecycleCommands: [],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.registryUpserts).toEqual([
      expect.objectContaining({
        url_hash: policyMediaUrlHash(tracked.url),
        url: tracked.url.trim(),
        state: 'active',
        revision: 1,
        provider: 'r2',
        ownership: 'command-owned',
        object_key: tracked.object_key,
        content_sha256: tracked.sha256,
      }),
    ]);
    expect(result.categoryBackfills).toContainEqual(
      expect.objectContaining({
        category_id: '507f1f77bcf86cd799439011',
        set: expect.objectContaining({
          image: tracked.url.trim(),
          'image_asset.url': tracked.url.trim(),
        }),
      }),
    );
    expect(result.counts).toMatchObject({
      tracked_media_assets_scanned: 0,
      tracked_media_assets_to_ensure: 1,
    });
  });

  it('quarantines a category asset that claims command ownership without complete proof', () => {
    const invalid = { ...commandOwnedAsset(), sha256: undefined };
    const result = planMigration({
      categories: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Travel Deals',
          lifecycle_status: 'active',
          revision: 1,
          image: invalid.url,
          image_asset: invalid,
        },
      ],
      offers: [],
      sources: [],
      registry: [],
      sourceIndexes: [],
    });

    expect(result.registryUpserts).toEqual([]);
    expect(result.quarantine).toContainEqual(
      expect.objectContaining({
        kind: 'invalid-command-owned-media-asset',
        category_id: '507f1f77bcf86cd799439011',
        field: 'image_asset',
      }),
    );
  });

  it('quarantines corrupt existing registry identity or lifecycle state instead of publishing readiness', () => {
    const tracked = commandOwnedAsset();
    const result = planMigration({
      categories: [],
      offers: [],
      sources: [],
      registry: [
        {
          _id: 'registry-corrupt',
          ...tracked,
          content_sha256: tracked.sha256,
          url_hash: 'f'.repeat(64),
          state: 'unknown',
          revision: 0,
        },
      ],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'invalid-media-registry-row',
          registry_id: 'registry-corrupt',
        }),
      ]),
    );
  });

  it('accepts an idempotent active registry row even after its revision has advanced', () => {
    const tracked = commandOwnedAsset(undefined, {
      owner_key: 'category-media-idempotent:image',
    });
    const registryRow = {
      _id: 'registry-active',
      url_hash: policyMediaUrlHash(tracked.url),
      url: tracked.url,
      state: 'active',
      revision: 9,
      provider: tracked.provider,
      ownership: tracked.ownership,
      owner_key: tracked.owner_key,
      owner_attempt_token: tracked.owner_attempt_token,
      bucket: tracked.bucket,
      object_key: tracked.object_key,
      content_sha256: tracked.sha256,
      original_name: tracked.original_name,
      content_type: tracked.content_type,
    };
    const result = planMigration({
      categories: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Travel Deals',
          lifecycle_status: 'active',
          revision: 1,
          image: tracked.url,
          image_asset: tracked,
        },
      ],
      offers: [],
      sources: [],
      registry: [registryRow],
      mediaWriteCommands: [
        mediaWriteProof({
          ownerType: 'category',
          ownerId: '507f1f77bcf86cd799439011',
          role: 'image',
          asset: tracked,
        }),
      ],
      lifecycleCommands: [],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.registryUpserts).toHaveLength(1);
  });

  it('inventories Category and Offer structured assets and backfills every exact committed command proof', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const offerId = '507f1f77bcf86cd799439012';
    const categoryBanner = commandOwnedAsset(
      'https://media.example/category-banner.png',
      {
        owner_key: 'aggregate-category-banner',
        object_key: `categories/aggregate-category-banner/attempt-1/${'b'.repeat(64)}.png`,
        sha256: 'b'.repeat(64),
        original_name: 'category-banner.png',
      },
    );
    const offerLogo = commandOwnedAsset(
      'https://media.example/offer-logo.png',
      {
        owner_key: 'offer-media-proof:logo',
        object_key: `brands/offer-media-proof/attempt-1/${'c'.repeat(64)}.png`,
        sha256: 'c'.repeat(64),
        original_name: 'offer-logo.png',
      },
    );
    const offerBanner = commandOwnedAsset(
      'https://media.example/offer-banner.png',
      {
        owner_key: 'offer-media-proof:banner',
        object_key: `brands/offer-media-proof/attempt-1/${'d'.repeat(64)}.png`,
        sha256: 'd'.repeat(64),
        original_name: 'offer-banner.png',
      },
    );
    const result = planMigration({
      categories: [
        {
          _id: categoryId,
          name: 'Travel Deals',
          name_normalized: 'travel deals',
          lifecycle_status: 'active',
          revision: 1,
          banner: categoryBanner.url,
          banner_asset: categoryBanner,
        },
      ],
      offers: [
        {
          _id: offerId,
          categories_normalized: null,
          logo: offerLogo.url,
          logo_desktop: offerLogo.url,
          logo_asset: offerLogo,
          banner: offerBanner.url,
          banner_mobile: offerBanner.url,
          banner_asset: offerBanner,
        },
      ],
      sources: [],
      registry: [],
      mediaWriteCommands: [
        (() => {
          const proof = mediaWriteProof({
            ownerType: 'offer',
            ownerId: offerId,
            role: 'logo',
            asset: offerLogo,
          });
          proof.planned_assets.push({
            role: 'banner',
            folder: 'brands',
            asset: offerBanner,
            upload_state: 'confirmed',
          });
          return proof;
        })(),
      ],
      lifecycleCommands: [
        lifecycleProof({ categoryId, asset: categoryBanner }),
      ],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.registryUpserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: categoryBanner.url }),
        expect.objectContaining({ url: offerLogo.url }),
        expect.objectContaining({ url: offerBanner.url }),
      ]),
    );
    expect(result.registryUpserts).toHaveLength(3);
    expect(result.counts).toMatchObject({
      structured_media_assets_scanned: 3,
      structured_media_assets_proven: 3,
      lifecycle_commands_scanned: 1,
    });
  });

  it('quarantines fabricated Category and Offer structured proof instead of publishing registry ownership', () => {
    const categoryAsset = commandOwnedAsset(undefined, {
      owner_key: 'fabricated-category:image',
    });
    const offerAsset = commandOwnedAsset(
      'https://media.example/fake-offer.png',
      {
        owner_key: 'fabricated-offer:logo',
        object_key: `brands/fabricated-offer/attempt-1/${'a'.repeat(64)}.png`,
      },
    );
    const result = planMigration({
      categories: [
        {
          _id: '507f1f77bcf86cd799439011',
          name: 'Fabricated Category',
          name_normalized: 'fabricated category',
          lifecycle_status: 'active',
          revision: 1,
          image: categoryAsset.url,
          image_asset: categoryAsset,
        },
      ],
      offers: [
        {
          _id: '507f1f77bcf86cd799439012',
          categories_normalized: null,
          logo: offerAsset.url,
          logo_asset: offerAsset,
        },
      ],
      sources: [],
      registry: [],
      mediaWriteCommands: [],
      lifecycleCommands: [],
      sourceIndexes: [],
    });

    expect(result.registryUpserts).toEqual([]);
    expect(result.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'missing-committed-media-command-proof',
          owner_type: 'category',
          owner_id: '507f1f77bcf86cd799439011',
          field: 'image_asset',
        }),
        expect.objectContaining({
          kind: 'missing-committed-media-command-proof',
          owner_type: 'offer',
          owner_id: '507f1f77bcf86cd799439012',
          field: 'logo_asset',
        }),
      ]),
    );
  });

  it('quarantines exact but uncommitted or ambiguous command proof', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const image = commandOwnedAsset(undefined, {
      owner_key: 'uncommitted-category:image',
    });
    const banner = commandOwnedAsset('https://media.example/ambiguous.png', {
      owner_key: 'ambiguous-category:banner',
      object_key: `categories/ambiguous-category/attempt-1/${'b'.repeat(64)}.png`,
      sha256: 'b'.repeat(64),
    });
    const result = planMigration({
      categories: [
        {
          _id: categoryId,
          name: 'Proof conflicts',
          name_normalized: 'proof conflicts',
          lifecycle_status: 'active',
          revision: 1,
          image: image.url,
          image_asset: image,
          banner: banner.url,
          banner_asset: banner,
        },
      ],
      offers: [],
      sources: [],
      registry: [],
      mediaWriteCommands: [
        mediaWriteProof({
          ownerType: 'category',
          ownerId: categoryId,
          role: 'image',
          asset: image,
          status: 'committing',
        }),
        mediaWriteProof({
          ownerType: 'category',
          ownerId: categoryId,
          role: 'banner',
          asset: banner,
        }),
      ],
      lifecycleCommands: [
        lifecycleProof({
          categoryId,
          asset: banner,
          id: 'second-exact-banner-proof',
        }),
      ],
      sourceIndexes: [],
    });

    expect(result.registryUpserts).toEqual([]);
    expect(result.quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'uncommitted-media-command-proof',
          field: 'image_asset',
        }),
        expect.objectContaining({
          kind: 'ambiguous-media-command-proof',
          field: 'banner_asset',
        }),
      ]),
    );
  });

  it('fails apply before data/index writes and publishes failed when tracked proof is missing', async () => {
    const { db, rows, writes, updates } = makeDb();
    const asset = commandOwnedAsset(undefined, {
      owner_key: 'missing-apply-proof:image',
    });
    Object.assign(rows.categories[0], {
      image: asset.url,
      image_asset: asset,
    });

    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'apply' }),
    ).rejects.toThrow(/quarantine/i);

    expect(writes).not.toContain('categories:bulkWrite');
    expect(
      updates
        .filter((entry) => entry.name === 'policy_integrity_states')
        .map((entry) => entry.update.$set.status),
    ).toEqual(['applying', 'failed']);
  });

  it('publishes a failed marker when an apply step is interrupted', async () => {
    const { db, updates, collections } = makeDb();
    collections.get('categories').createIndex = jest
      .fn()
      .mockRejectedValue(new Error('index build interrupted'));

    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'apply' }),
    ).rejects.toThrow('index build interrupted');
    expect(
      updates
        .filter((entry) => entry.name === 'policy_integrity_states')
        .map((entry) => entry.update.$set.status),
    ).toEqual(['applying', 'failed']);
  });

  it('refuses to downgrade a durable marker owned by a future migration version', async () => {
    const { db, rows, writes, updates } = makeDb();
    rows.policy_integrity_states.push({
      key: 'category-integrity',
      migration_version: 3,
      status: 'ready',
      write_epoch: 17,
    });

    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'apply' }),
    ).rejects.toThrow('future migration version 3');

    expect(writes).not.toContain('categories:bulkWrite');
    expect(
      updates.filter((entry) => entry.name === 'policy_integrity_states'),
    ).toEqual([]);
  });

  it('atomically excludes a future migration version from v2 lease acquisition', async () => {
    const { db, collections, rows } = makeDb();
    const state = collections.get('policy_integrity_states');
    state.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      key: 'category-integrity',
      migration_version: 3,
      status: 'ready',
    });
    state.updateOne.mockResolvedValueOnce({
      matchedCount: 0,
      modifiedCount: 0,
    });

    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'apply' }),
    ).rejects.toThrow('future migration version 3');

    expect(state.updateOne.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        key: 'category-integrity',
        $and: expect.arrayContaining([
          {
            $or: [
              { migration_version: { $exists: false } },
              { migration_version: { $lte: 2 } },
            ],
          },
        ]),
      }),
    );
    expect(rows.policy_integrity_states).toEqual([]);
  });

  it('accepts a durable tombstone whose purged category no longer exists', () => {
    const result = planMigration({
      categories: [],
      offers: [],
      sources: [
        {
          _id: 'source-1',
          source: 'involve',
          source_key: '  Retired   Travel ',
          category_id: '507f1f77bcf86cd799439099',
          active: false,
          tombstoned: true,
          revision: 2,
          request_key: 'retired-travel',
        },
      ],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.sourceBackfills).toEqual([
      expect.objectContaining({
        set: expect.objectContaining({
          source_key: 'retired travel',
        }),
      }),
    ]);
  });

  it('treats purging categories as tombstoned aliases, never active aliases', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const result = planMigration({
      categories: [
        {
          _id: categoryId,
          name: 'Travel Deals',
          lifecycle_status: 'purging',
          revision: 4,
        },
      ],
      offers: [],
      sources: [],
      sourceIndexes: [],
    });

    expect(result.aliases).toContainEqual(
      expect.objectContaining({
        source: 'legacy',
        source_key: 'travel deals',
        active: false,
        tombstoned: true,
      }),
    );
  });

  it('treats an absent source collection index inventory as empty', async () => {
    const { db, writes, collections } = makeDb();
    collections.get('policy_category_sources').indexes = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('ns does not exist'), {
          codeName: 'NamespaceNotFound',
        }),
      );

    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'dry-run' }),
    ).resolves.toMatchObject({ mode: 'dry-run' });
    expect(writes).toEqual([]);
  });

  it('canonicalizes padded and ObjectId-like policy references before exact indexing', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const objectIdLike = { toString: () => categoryId };
    const result = planMigration({
      categories: [
        {
          _id: categoryId,
          name: 'Travel Deals',
          lifecycle_status: 'active',
          revision: 1,
        },
      ],
      offers: [
        {
          _id: 'offer-padded',
          policy_category_id: `  ${categoryId}  `,
        },
        {
          _id: 'offer-object-id',
          policy_category_id: objectIdLike,
        },
      ],
      sources: [],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.offerBackfills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          offer_id: 'offer-padded',
          set: expect.objectContaining({ policy_category_id: categoryId }),
        }),
        expect.objectContaining({
          offer_id: 'offer-object-id',
          set: expect.objectContaining({ policy_category_id: categoryId }),
        }),
      ]),
    );
  });

  it.each(['retired', 'purging', 'corrupt-state'])(
    'quarantines a direct policy reference to a %s category across ObjectId/string forms',
    (lifecycleStatus) => {
      const categoryId = '507f1f77bcf86cd799439011';
      const result = planMigration({
        categories: [
          {
            _id: { toString: () => categoryId },
            name: 'Travel Deals',
            lifecycle_status: lifecycleStatus,
            revision: 4,
          },
        ],
        offers: [
          {
            _id: `offer-${lifecycleStatus}`,
            policy_category_id: `  ${categoryId}  `,
          },
        ],
        sources: [],
        sourceIndexes: [],
      });

      expect(result.quarantine).toContainEqual({
        kind: 'offer-policy-category-inactive',
        offer_id: `offer-${lifecycleStatus}`,
        policy_category_id: categoryId,
        lifecycle_status: lifecycleStatus,
      });
    },
  );

  it('quarantines a non-custom direct policy reference when its category is missing', () => {
    const missingCategoryId = '507f1f77bcf86cd799439099';
    const result = planMigration({
      categories: [],
      offers: [
        {
          _id: 'offer-missing-category',
          policy_category_id: { toString: () => missingCategoryId },
        },
        {
          _id: 'offer-custom-policy',
          policy_category_id: 'custom',
        },
      ],
      sources: [],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([
      {
        kind: 'offer-policy-category-missing',
        offer_id: 'offer-missing-category',
        policy_category_id: missingCategoryId,
      },
    ]);
  });

  it('keeps dry-run zero-write and apply fail-closed for an inactive direct reference', async () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const configureInactiveReference = (collections: Map<string, any>) => {
      collections.get('categories').find = jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: categoryId,
            name: 'Travel Deals',
            name_normalized: 'travel deals',
            lifecycle_status: 'retired',
            revision: 3,
          },
        ]),
      }));
      collections.get('offers').find = jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: 'offer-retired-reference',
            policy_category_id: categoryId,
          },
        ]),
      }));
    };

    const dryRun = makeDb();
    configureInactiveReference(dryRun.collections);
    await expect(
      runPolicyCategoryIntegrityMigration({ db: dryRun.db, mode: 'dry-run' }),
    ).resolves.toMatchObject({
      mode: 'dry-run',
      quarantine: [
        expect.objectContaining({
          kind: 'offer-policy-category-inactive',
          offer_id: 'offer-retired-reference',
          policy_category_id: categoryId,
          lifecycle_status: 'retired',
        }),
      ],
    });
    expect(dryRun.writes).toEqual([]);

    const apply = makeDb();
    configureInactiveReference(apply.collections);
    await expect(
      runPolicyCategoryIntegrityMigration({ db: apply.db, mode: 'apply' }),
    ).rejects.toThrow(/quarantine/i);
    expect(
      apply.writes.filter(
        (entry) =>
          entry.startsWith('categories:') ||
          entry.startsWith('offers:') ||
          entry.startsWith('policy_category_sources:'),
      ),
    ).toEqual([]);
    expect(
      apply.updates
        .filter((entry) => entry.name === 'policy_integrity_states')
        .map((entry) => entry.update.$set.status),
    ).toEqual(['applying', 'failed']);
  });

  it('accepts a runtime-fenced explicitly uncategorized raw offer on a later apply', () => {
    const result = planMigration({
      categories: [],
      offers: [
        {
          _id: 'offer-intentionally-unmapped',
          categories: 'Partner-only category',
          categories_normalized: null,
        },
      ],
      sources: [],
      sourceIndexes: [],
    });

    expect(result.quarantine).toEqual([]);
    expect(result.offerBackfills).toEqual([]);
  });

  it('quarantines an active category whose current identity is permanently tombstoned', () => {
    const categoryId = '507f1f77bcf86cd799439011';
    const result = planMigration({
      categories: [
        {
          _id: categoryId,
          name: 'Travel Deals',
          lifecycle_status: 'active',
          revision: 2,
        },
      ],
      offers: [],
      sources: [
        {
          _id: 'source-tombstone',
          source: 'policy-admin',
          source_key: 'travel deals',
          category_id: categoryId,
          request_key: 'retired-before-rename',
          active: false,
          tombstoned: true,
          revision: 3,
        },
      ],
      sourceIndexes: [],
    });

    expect(result.quarantine).toContainEqual(
      expect.objectContaining({
        kind: 'active-category-identity-tombstoned',
        category_id: categoryId,
        source_key: 'travel deals',
      }),
    );
  });

  it('publishes failed without data writes when quarantine is non-empty', async () => {
    const { db, writes, updates, collections } = makeDb();
    collections.get('categories').find = jest.fn(() => ({
      toArray: jest.fn().mockResolvedValue([
        { _id: '507f1f77bcf86cd799439011', name: 'Travel' },
        { _id: '507f1f77bcf86cd799439012', name: '  TRAVEL ' },
      ]),
    }));
    await expect(
      runPolicyCategoryIntegrityMigration({ db, mode: 'apply' }),
    ).rejects.toThrow(/quarantine/i);
    expect(
      writes.filter(
        (entry) =>
          entry.startsWith('categories:') ||
          entry.startsWith('offers:') ||
          entry.startsWith('policy_category_sources:'),
      ),
    ).toEqual([]);
    expect(
      updates
        .filter((entry) => entry.name === 'policy_integrity_states')
        .map((entry) => entry.update.$set.status),
    ).toEqual(['applying', 'failed']);
  });
});
