import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildGcsR2DestinationUrl,
  copyOrVerifyGcsUrl,
  GCS_R2_TARGET_SPECS,
  GcsR2MigrationPort,
  GcsR2ObjectPort,
  parseStoredMediaMigrationArgs,
  policyMediaUrlHash,
  runStoredMediaMigration,
} from '../../scripts/migrate-stored-media-gcs-to-r2';
import { STORED_MEDIA_TARGET_SPECS } from '../../scripts/stored-media-targets';

type HarnessOptions = {
  documents?: Record<string, Record<string, unknown>[]>;
  registry?: Array<{ url_hash: string; url: string; state: string }>;
  registryAfterCopy?: Array<{ url_hash: string; url: string; state: string }>;
  updateMatched?: boolean;
};

function harness(options: HarnessOptions = {}) {
  const events: string[] = [];
  const copies: Array<{ sourceUrl: string; destinationUrl: string }> = [];
  const updates: Array<{
    collection: string;
    filter: Record<string, unknown>;
    set: Record<string, unknown>;
  }> = [];
  let copyStarted = false;
  const rows = options.documents ?? {
    offers: [
      {
        _id: 'offer-1',
        logo: 'https://storage.googleapis.com/legacy-bucket/brands/acme.png',
      },
    ],
  };
  const port: GcsR2MigrationPort = {
    async *scan(target) {
      events.push(`scan:${target.collection}`);
      for (const row of rows[target.collection] ?? []) yield row;
    },
    async findRegistryByHash(urlHash) {
      events.push('registry:read');
      const source =
        copyStarted && options.registryAfterCopy
          ? options.registryAfterCopy
          : (options.registry ?? []);
      return source.find((row) => row.url_hash === urlHash) ?? null;
    },
    async copyOrVerify(sourceUrl, destinationUrl) {
      copyStarted = true;
      events.push('r2:copy');
      copies.push({ sourceUrl, destinationUrl });
    },
    async compareAndSet(collection, filter, set) {
      events.push('mongo:update');
      updates.push({ collection, filter, set });
      return options.updateMatched ?? true;
    },
  };
  return { events, copies, updates, port };
}

function silentLogger() {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    table: jest.fn(),
  };
}

function r2Harness() {
  const objects = new Map<
    string,
    { body: Buffer; metadata: Record<string, string> }
  >();
  const puts: Array<{
    objectKey: string;
    body: Uint8Array;
    contentType: string;
    metadata: Record<string, string>;
  }> = [];
  const port: GcsR2ObjectPort = {
    async read(objectKey) {
      const object = objects.get(objectKey);
      return object
        ? {
            body: Buffer.from(object.body),
            metadata: { ...object.metadata },
          }
        : null;
    },
    async put(entry) {
      puts.push(entry);
      objects.set(entry.objectKey, {
        body: Buffer.from(entry.body),
        metadata: { ...entry.metadata },
      });
    },
  };
  return { objects, port, puts };
}

describe('GCS to R2 policy media migration contract', () => {
  it('defaults to dry-run and requires an explicit apply flag', () => {
    expect(parseStoredMediaMigrationArgs([])).toEqual({
      dryRun: true,
      collection: undefined,
      skipCopy: false,
    });
    expect(parseStoredMediaMigrationArgs(['--dry-run'])).toMatchObject({
      dryRun: true,
    });
    expect(parseStoredMediaMigrationArgs(['--apply'])).toMatchObject({
      dryRun: false,
    });
    expect(
      parseStoredMediaMigrationArgs(['--collection=offers']),
    ).toMatchObject({ collection: 'offers' });
    expect(() =>
      parseStoredMediaMigrationArgs(['--apply', '--dry-run']),
    ).toThrow('Choose either --apply or --dry-run');
    expect(() =>
      parseStoredMediaMigrationArgs(['--collection=not-a-real-collection']),
    ).toThrow('Unknown stored-media collection');
  });

  it('keeps its target inventory in lockstep with the shared stored-media list', () => {
    expect(GCS_R2_TARGET_SPECS).toEqual(STORED_MEDIA_TARGET_SPECS);
  });

  it('boots with Node 24 native TypeScript and no SWC/TypeScript 7 hook', () => {
    const apiRoot = path.resolve(__dirname, '../..');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(apiRoot, 'package.json'), 'utf8'),
    );
    const command = packageJson.scripts['media:migrate-gcs-to-r2'];
    const dryCommand = packageJson.scripts['media:migrate-gcs-to-r2:dry'];
    expect(command).toContain('--experimental-strip-types');
    expect(command).not.toContain('@swc-node/register');
    expect(command).not.toContain('--apply');
    expect(dryCommand).toContain('--experimental-strip-types');
    expect(dryCommand).toContain('--dry-run');
    expect(dryCommand).not.toContain('@swc-node/register');

    const env = { ...process.env };
    delete env.MONGO_URI;
    const result = spawnSync(
      process.execPath,
      [
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
        '--experimental-strip-types',
        'scripts/migrate-stored-media-gcs-to-r2.ts',
      ],
      { cwd: apiRoot, env, encoding: 'utf8' },
    );
    expect(process.versions.node).toMatch(/^24\./);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('MONGO_URI is required');
    expect(result.stderr).not.toContain('ts.Extension');
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });

  it('dry-run audits registry state but performs no copy or database mutation', async () => {
    const h = harness();
    const stats = await runStoredMediaMigration(h.port, {
      dryRun: true,
      publicBaseUrl: 'https://media.example',
      logger: silentLogger(),
    });

    expect(stats).toMatchObject({
      dryRun: true,
      planned: 1,
      migrated: 0,
      legacyPolicyUrlsClassifiedNondeletable: 1,
    });
    expect(h.copies).toEqual([]);
    expect(h.updates).toEqual([]);
    expect(h.events.filter((event) => event === 'registry:read')).toHaveLength(
      2,
    );
  });

  it('namespaces equal object keys by source bucket and preserves different bytes', async () => {
    const firstSource =
      'https://storage.googleapis.com/bucket-a/shared/logo.png';
    const secondSource =
      'https://storage.googleapis.com/bucket-b/shared/logo.png';
    const firstDestination = buildGcsR2DestinationUrl(
      firstSource,
      'https://media.example',
    );
    const secondDestination = buildGcsR2DestinationUrl(
      secondSource,
      'https://media.example',
    );
    expect(firstDestination).not.toBe(secondDestination);
    expect(firstDestination).toMatch(/\/shared\/logo\.png$/);
    expect(secondDestination).toMatch(/\/shared\/logo\.png$/);

    const r2 = r2Harness();
    const sourceBodies = new Map([
      [firstSource, Buffer.from('bucket-a-bytes')],
      [secondSource, Buffer.from('bucket-b-different-bytes')],
    ]);
    const fetchSource = async (sourceUrl: string) => ({
      body: sourceBodies.get(sourceUrl)!,
      contentType: 'image/png',
    });
    await copyOrVerifyGcsUrl(
      r2.port,
      'https://media.example',
      firstSource,
      firstDestination!,
      false,
      fetchSource,
    );
    await copyOrVerifyGcsUrl(
      r2.port,
      'https://media.example',
      secondSource,
      secondDestination!,
      false,
      fetchSource,
    );

    expect(r2.puts).toHaveLength(2);
    expect(r2.puts[0].objectKey).not.toBe(r2.puts[1].objectKey);
    expect(Buffer.from(r2.puts[0].body).toString()).toBe('bucket-a-bytes');
    expect(Buffer.from(r2.puts[1].body).toString()).toBe(
      'bucket-b-different-bytes',
    );
  });

  it('deduplicates repeated references to the exact same GCS source', async () => {
    const source =
      'https://storage.googleapis.com/legacy-bucket/brands/acme.png';
    const h = harness({
      documents: {
        offers: [
          {
            _id: 'offer-1',
            logo: source,
            logo_desktop: source,
          },
        ],
      },
    });

    await runStoredMediaMigration(h.port, {
      dryRun: false,
      publicBaseUrl: 'https://media.example',
      logger: silentLogger(),
    });

    expect(h.copies).toHaveLength(1);
    expect(h.updates).toHaveLength(1);
  });

  it('fails closed when an existing R2 object body is not the source content', async () => {
    const source =
      'https://storage.googleapis.com/legacy-bucket/brands/acme.png';
    const destination = buildGcsR2DestinationUrl(
      source,
      'https://media.example',
    )!;
    const r2 = r2Harness();
    const fetchSource = async () => ({
      body: Buffer.from('expected-source-bytes'),
      contentType: 'image/png',
    });
    await copyOrVerifyGcsUrl(
      r2.port,
      'https://media.example',
      source,
      destination,
      false,
      fetchSource,
    );
    const objectKey = r2.puts[0].objectKey;
    r2.objects.get(objectKey)!.body = Buffer.from('wrong-existing-object');

    await expect(
      copyOrVerifyGcsUrl(
        r2.port,
        'https://media.example',
        source,
        destination,
        false,
        fetchSource,
      ),
    ).rejects.toThrow('content does not match');
    expect(r2.puts).toHaveLength(1);
  });

  it('fails closed when an existing R2 object has no verifiable identity metadata', async () => {
    const source =
      'https://storage.googleapis.com/legacy-bucket/brands/acme.png';
    const destination = buildGcsR2DestinationUrl(
      source,
      'https://media.example',
    )!;
    const r2 = r2Harness();
    const fetchSource = async () => ({
      body: Buffer.from('expected-source-bytes'),
      contentType: 'image/png',
    });
    await copyOrVerifyGcsUrl(
      r2.port,
      'https://media.example',
      source,
      destination,
      false,
      fetchSource,
    );
    const objectKey = r2.puts[0].objectKey;
    r2.objects.get(objectKey)!.metadata = {};

    await expect(
      copyOrVerifyGcsUrl(
        r2.port,
        'https://media.example',
        source,
        destination,
        false,
        fetchSource,
      ),
    ).rejects.toThrow('identity metadata is missing or does not match');
    expect(r2.puts).toHaveLength(1);
  });

  it('refuses structured Offer proof before any R2 or Mongo mutation', async () => {
    const h = harness({
      documents: {
        offers: [
          {
            _id: 'offer-1',
            logo: 'https://storage.googleapis.com/bucket/logo.png',
            logo_asset: { ownership: 'command-owned' },
          },
        ],
      },
    });

    await expect(
      runStoredMediaMigration(h.port, {
        dryRun: false,
        publicBaseUrl: 'https://media.example',
        logger: silentLogger(),
      }),
    ).rejects.toThrow('structured proof logo_asset');
    expect(h.copies).toEqual([]);
    expect(h.updates).toEqual([]);
  });

  it.each(['active', 'deleting', 'deleted'])(
    'refuses a %s registry row for the current policy URL',
    async (state) => {
      const current =
        'https://storage.googleapis.com/legacy-bucket/brands/acme.png';
      const h = harness({
        registry: [
          { url_hash: policyMediaUrlHash(current), url: current, state },
        ],
      });

      await expect(
        runStoredMediaMigration(h.port, {
          dryRun: false,
          publicBaseUrl: 'https://media.example',
          logger: silentLogger(),
        }),
      ).rejects.toThrow(`registry state is ${state}`);
      expect(h.copies).toEqual([]);
      expect(h.updates).toEqual([]);
    },
  );

  it('refuses a tracked prospective URL before the first copy', async () => {
    const destination = buildGcsR2DestinationUrl(
      'https://storage.googleapis.com/legacy-bucket/brands/acme.png',
      'https://media.example',
    )!;
    const h = harness({
      registry: [
        {
          url_hash: policyMediaUrlHash(destination),
          url: destination,
          state: 'active',
        },
      ],
    });

    await expect(
      runStoredMediaMigration(h.port, {
        dryRun: false,
        publicBaseUrl: 'https://media.example',
        logger: silentLogger(),
      }),
    ).rejects.toThrow('prospective URL');
    expect(h.copies).toEqual([]);
    expect(h.updates).toEqual([]);
  });

  it('rechecks both URLs after copy and refuses a newly tracked destination', async () => {
    const destination = buildGcsR2DestinationUrl(
      'https://storage.googleapis.com/legacy-bucket/brands/acme.png',
      'https://media.example',
    )!;
    const h = harness({
      registryAfterCopy: [
        {
          url_hash: policyMediaUrlHash(destination),
          url: destination,
          state: 'active',
        },
      ],
    });

    await expect(
      runStoredMediaMigration(h.port, {
        dryRun: false,
        publicBaseUrl: 'https://media.example',
        logger: silentLogger(),
      }),
    ).rejects.toThrow('final prospective URL');
    expect(h.copies).toHaveLength(1);
    expect(h.updates).toEqual([]);
  });

  it('uses an exact compare-and-set and preserves proof absence on apply', async () => {
    const h = harness();
    const stats = await runStoredMediaMigration(h.port, {
      dryRun: false,
      publicBaseUrl: 'https://media.example',
      logger: silentLogger(),
    });

    expect(stats).toMatchObject({ planned: 1, migrated: 1 });
    expect(h.copies).toHaveLength(1);
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0]).toEqual({
      collection: 'offers',
      filter: {
        _id: 'offer-1',
        logo: 'https://storage.googleapis.com/legacy-bucket/brands/acme.png',
        logo_asset: { $exists: false },
      },
      set: {
        logo: buildGcsR2DestinationUrl(
          'https://storage.googleapis.com/legacy-bucket/brands/acme.png',
          'https://media.example',
        ),
      },
    });
  });

  it('compare-and-sets complete arrays even when legacy values contain whitespace', async () => {
    const source =
      '  https://storage.googleapis.com/legacy-bucket/evidence/a.png  ';
    const h = harness({
      documents: {
        missionorders: [
          { _id: 'mission-1', attachments: [source, 'keep-this-value'] },
        ],
      },
    });
    await runStoredMediaMigration(h.port, {
      dryRun: false,
      publicBaseUrl: 'https://media.example',
      logger: silentLogger(),
    });

    expect(h.updates).toEqual([
      {
        collection: 'missionorders',
        filter: {
          _id: 'mission-1',
          attachments: [source, 'keep-this-value'],
        },
        set: {
          attachments: [
            buildGcsR2DestinationUrl(source, 'https://media.example'),
            'keep-this-value',
          ],
        },
      },
    ]);
  });

  it('fails closed when the exact owner document changes before update', async () => {
    const h = harness({ updateMatched: false });
    await expect(
      runStoredMediaMigration(h.port, {
        dryRun: false,
        publicBaseUrl: 'https://media.example',
        logger: silentLogger(),
      }),
    ).rejects.toThrow('changed after safety checks');
    expect(h.copies).toHaveLength(1);
    expect(h.updates).toHaveLength(1);
  });
});
