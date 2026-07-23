/**
 * Migrate legacy public GCS references to deterministic R2 public URLs.
 *
 * Policy-media safety contract
 * ----------------------------
 * Offer and Category raw URL fields may be rewritten only when they have no
 * structured ownership proof and neither the current nor prospective URL is
 * present in policy_media_asset_registry. Those URLs remain explicitly
 * legacy-untracked/nondeletable; this script never manufactures command-owned
 * proof or a registry row. Apply uses exact compare-and-set filters and repeats
 * the registry checks after R2 copy, immediately before the Mongo update.
 *
 * The default mode is a read-only dry run. Mutation requires --apply.
 */

import 'dotenv/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';

export type StoredMediaTargetSpec = {
  collection: string;
  folder?: string;
  fields: string[];
  arrayFields?: string[];
};

/**
 * Kept byte-for-byte equivalent to stored-media-targets.ts and guarded by a
 * contract test. This script intentionally has no local TypeScript imports so
 * Node 26 can execute it through native type stripping without SWC/TS7.
 */
export const GCS_R2_TARGET_SPECS: StoredMediaTargetSpec[] = [
  {
    collection: 'banners',
    folder: 'banner-home',
    fields: ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'],
  },
  {
    collection: 'all_brand_banners',
    folder: 'banner-all-brand',
    fields: ['image_1', 'image_2', 'image_3'],
  },
  {
    collection: 'specific_page_banners',
    folder: 'banner-specific-page',
    fields: ['image_1', 'image_2', 'image_3'],
  },
  {
    collection: 'offers',
    folder: 'brands',
    fields: ['logo', 'logo_desktop', 'logo_mobile'],
  },
  {
    // #493 — mirrors the split in stored-media-targets.ts. `logo_circle` sits with the
    // banner fields because the banner upload path writes it.
    collection: 'offers',
    folder: 'brand-banners',
    fields: ['banner', 'banner_mobile', 'logo_circle'],
  },
  {
    collection: 'categories',
    folder: 'categories',
    fields: ['image', 'banner'],
  },
  {
    collection: 'quests',
    folder: 'quests',
    fields: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'],
  },
  {
    collection: 'withdraws',
    folder: 'withdraw-slips',
    fields: ['slip_file'],
  },
  {
    collection: 'missionorders',
    folder: 'missing-orders',
    fields: [],
    arrayFields: ['attachments'],
  },
  {
    collection: 'users',
    folder: 'profile-avatars',
    fields: ['avatar_url'],
  },
];

type RegistryRow = {
  url_hash: string;
  url: string;
  state: string;
};

export type GcsR2MigrationPort = {
  scan(target: StoredMediaTargetSpec): AsyncIterable<Record<string, unknown>>;
  findRegistryByHash(urlHash: string): Promise<RegistryRow | null>;
  copyOrVerify(sourceUrl: string, destinationUrl: string): Promise<void>;
  compareAndSet(
    collection: string,
    filter: Record<string, unknown>,
    set: Record<string, unknown>,
  ): Promise<boolean>;
};

export type GcsR2ObjectPort = {
  read(objectKey: string): Promise<{
    body: Uint8Array;
    metadata: Record<string, string>;
  } | null>;
  put(entry: {
    objectKey: string;
    body: Uint8Array;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<void>;
};

export type GcsSourceFetcher = (sourceUrl: string) => Promise<{
  body: Uint8Array;
  contentType: string;
}>;

export type StoredMediaMigrationStats = {
  dryRun: boolean;
  scanned: number;
  planned: number;
  migrated: number;
  skipped: number;
  documentsPlanned: number;
  documentsUpdated: number;
  legacyPolicyUrlsClassifiedNondeletable: number;
};

type MigrationLogger = Pick<Console, 'log' | 'warn' | 'error' | 'table'>;

type PlannedDocument = {
  target: StoredMediaTargetSpec;
  id: unknown;
  filter: Record<string, unknown>;
  set: Record<string, unknown>;
  sourceUrls: string[];
  destinationUrls: string[];
  migrations: Array<{ sourceUrl: string; destinationUrl: string }>;
};

const POLICY_PROOF_FIELDS: Record<string, Record<string, string>> = {
  offers: {
    logo: 'logo_asset',
    logo_desktop: 'logo_asset',
    logo_mobile: 'logo_asset',
    logo_circle: 'logo_asset',
    banner: 'banner_asset',
    banner_mobile: 'banner_asset',
  },
  categories: {
    image: 'image_asset',
    banner: 'banner_asset',
  },
};

const GCS_PUBLIC_HOST = 'storage.googleapis.com';
const GCS_DESTINATION_PREFIX = 'gcs';
const GCS_SOURCE_ID_METADATA = 'gcs-source-id-sha256';
const GCS_CONTENT_METADATA = 'gcs-content-sha256';

function hasOwn(value: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

export function policyMediaUrlHash(value: string): string {
  return createHash('sha256').update(value.trim()).digest('hex');
}

function parseGcsPublicUrl(
  value: unknown,
): { bucket: string; objectKey: string } | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('https://')) return null;
  try {
    const url = new URL(trimmed);
    if (url.hostname !== GCS_PUBLIC_HOST) return null;
    const valuePath = url.pathname.replace(/^\/+/, '');
    const slashIndex = valuePath.indexOf('/');
    if (slashIndex <= 0) return null;
    const bucket = valuePath.slice(0, slashIndex);
    const objectKey = valuePath.slice(slashIndex + 1);
    return bucket && objectKey ? { bucket, objectKey } : null;
  } catch {
    return null;
  }
}

function buildR2PublicUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.trim().replace(/\/+$/, '');
  if (!base) throw new Error('R2_PUBLIC_BASE_URL is required');
  return `${base}/${objectKey.replace(/^\/+/, '')}`;
}

function buildGcsR2ObjectKey(location: {
  bucket: string;
  objectKey: string;
}): string {
  const safeBucket =
    location.bucket
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'bucket';
  const bucketDigest = createHash('sha256')
    .update(location.bucket)
    .digest('hex');
  return `${GCS_DESTINATION_PREFIX}/${safeBucket}-${bucketDigest}/${location.objectKey}`;
}

export function buildGcsR2DestinationUrl(
  value: unknown,
  publicBaseUrl: string,
): string | null {
  const location = parseGcsPublicUrl(value);
  return location
    ? buildR2PublicUrl(publicBaseUrl, buildGcsR2ObjectKey(location))
    : null;
}

export function parseStoredMediaMigrationArgs(argv: string[]): {
  dryRun: boolean;
  collection: string | undefined;
  skipCopy: boolean;
} {
  if (argv.includes('--apply') && argv.includes('--dry-run')) {
    throw new Error('Choose either --apply or --dry-run, not both');
  }
  const collection = argv
    .find((arg) => arg.startsWith('--collection='))
    ?.slice('--collection='.length)
    .trim();
  if (
    collection &&
    !GCS_R2_TARGET_SPECS.some((target) => target.collection === collection)
  ) {
    throw new Error(`Unknown stored-media collection: ${collection}`);
  }
  return {
    dryRun: !argv.includes('--apply'),
    collection: collection || undefined,
    skipCopy: argv.includes('--skip-copy'),
  };
}

async function assertRegistryAbsent(
  port: GcsR2MigrationPort,
  url: string,
  stage: string,
): Promise<void> {
  const hash = policyMediaUrlHash(url);
  const row = await port.findRegistryByHash(hash);
  if (!row) return;
  if (row.url_hash !== hash || row.url !== url) {
    throw new Error(`Policy media registry hash collision for ${url}`);
  }
  throw new Error(
    `Refusing ${stage}: registry state is ${row.state} for ${url}`,
  );
}

function policyProofField(collection: string, field: string): string | null {
  return POLICY_PROOF_FIELDS[collection]?.[field] ?? null;
}

function assertNoStructuredProof(
  collection: string,
  document: Record<string, unknown>,
  field: string,
): string | null {
  const proofField = policyProofField(collection, field);
  if (!proofField) return null;
  if (hasOwn(document, proofField)) {
    throw new Error(
      `Refusing ${collection}.${field}: structured proof ${proofField} is present`,
    );
  }
  return proofField;
}

async function planDocument(
  port: GcsR2MigrationPort,
  target: StoredMediaTargetSpec,
  document: Record<string, unknown>,
  publicBaseUrl: string,
  stats: StoredMediaMigrationStats,
): Promise<PlannedDocument | null> {
  const set: Record<string, unknown> = {};
  const filter: Record<string, unknown> = { _id: document._id };
  const proofFields = new Set<string>();
  const migrations: Array<{ sourceUrl: string; destinationUrl: string }> = [];

  for (const field of target.fields) {
    stats.scanned += 1;
    const sourceUrl =
      typeof document[field] === 'string' ? document[field].trim() : '';
    const destinationUrl = buildGcsR2DestinationUrl(sourceUrl, publicBaseUrl);
    if (!destinationUrl) {
      stats.skipped += 1;
      continue;
    }
    const proofField = assertNoStructuredProof(
      target.collection,
      document,
      field,
    );
    if (proofField) proofFields.add(proofField);
    filter[field] = document[field];
    set[field] = destinationUrl;
    migrations.push({ sourceUrl, destinationUrl });
    stats.planned += 1;
    if (policyProofField(target.collection, field)) {
      stats.legacyPolicyUrlsClassifiedNondeletable += 1;
    }
  }

  for (const field of target.arrayFields ?? []) {
    const values = Array.isArray(document[field]) ? document[field] : [];
    let changed = false;
    const nextValues = values.map((value) => {
      stats.scanned += 1;
      const sourceUrl = typeof value === 'string' ? value.trim() : '';
      const destinationUrl = buildGcsR2DestinationUrl(sourceUrl, publicBaseUrl);
      if (!destinationUrl) {
        stats.skipped += 1;
        return value;
      }
      migrations.push({ sourceUrl, destinationUrl });
      stats.planned += 1;
      changed = true;
      return destinationUrl;
    });
    if (changed) {
      filter[field] = document[field];
      set[field] = nextValues;
    }
  }

  if (migrations.length === 0) return null;
  for (const proofField of proofFields) {
    filter[proofField] = { $exists: false };
  }

  const sourceUrls = [...new Set(migrations.map((entry) => entry.sourceUrl))];
  const destinationUrls = [
    ...new Set(migrations.map((entry) => entry.destinationUrl)),
  ];
  for (const url of sourceUrls) {
    await assertRegistryAbsent(port, url, 'tracked current URL migration');
  }
  for (const url of destinationUrls) {
    await assertRegistryAbsent(port, url, 'tracked prospective URL migration');
  }

  return {
    target,
    id: document._id,
    filter,
    set,
    sourceUrls,
    destinationUrls,
    migrations,
  };
}

function buildCopyPlan(plans: PlannedDocument[]): Map<string, string> {
  const destinationSources = new Map<string, string>();
  const copies = new Map<string, string>();
  for (const plan of plans) {
    for (const migration of plan.migrations) {
      const existingDestination = copies.get(migration.sourceUrl);
      if (
        existingDestination &&
        existingDestination !== migration.destinationUrl
      ) {
        throw new Error(
          `One GCS source resolved to conflicting R2 URLs: ${migration.sourceUrl}`,
        );
      }
      const existingSource = destinationSources.get(migration.destinationUrl);
      if (existingSource && existingSource !== migration.sourceUrl) {
        throw new Error(
          `Distinct GCS sources resolved to one R2 URL: ${existingSource} and ${migration.sourceUrl}`,
        );
      }
      copies.set(migration.sourceUrl, migration.destinationUrl);
      destinationSources.set(migration.destinationUrl, migration.sourceUrl);
    }
  }
  return copies;
}

export async function runStoredMediaMigration(
  port: GcsR2MigrationPort,
  options: {
    dryRun: boolean;
    publicBaseUrl: string;
    collection?: string;
    logger?: MigrationLogger;
  },
): Promise<StoredMediaMigrationStats> {
  const logger = options.logger ?? console;
  const stats: StoredMediaMigrationStats = {
    dryRun: options.dryRun,
    scanned: 0,
    planned: 0,
    migrated: 0,
    skipped: 0,
    documentsPlanned: 0,
    documentsUpdated: 0,
    legacyPolicyUrlsClassifiedNondeletable: 0,
  };
  const plans: PlannedDocument[] = [];

  for (const target of GCS_R2_TARGET_SPECS) {
    if (options.collection && target.collection !== options.collection) {
      continue;
    }
    for await (const document of port.scan(target)) {
      const plan = await planDocument(
        port,
        target,
        document,
        options.publicBaseUrl,
        stats,
      );
      if (plan) plans.push(plan);
    }
  }
  stats.documentsPlanned = plans.length;
  const copies = buildCopyPlan(plans);

  if (options.dryRun) {
    logger.log(
      `[migrate-stored-media] DRY RUN planned ${stats.planned} URL rewrites; zero writes`,
    );
    return stats;
  }

  for (const [sourceUrl, destinationUrl] of copies) {
    await port.copyOrVerify(sourceUrl, destinationUrl);
  }

  for (const plan of plans) {
    for (const url of plan.sourceUrls) {
      await assertRegistryAbsent(port, url, 'final current URL migration');
    }
    for (const url of plan.destinationUrls) {
      await assertRegistryAbsent(port, url, 'final prospective URL migration');
    }
    const matched = await port.compareAndSet(
      plan.target.collection,
      plan.filter,
      plan.set,
    );
    if (!matched) {
      throw new Error(
        `${plan.target.collection} ${String(plan.id)} changed after safety checks; refusing overwrite`,
      );
    }
    stats.documentsUpdated += 1;
    stats.migrated += plan.migrations.length;
  }
  return stats;
}

function requiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

type R2Environment = {
  bucket: string;
  publicBaseUrl: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function requireR2ApplyEnv(env: NodeJS.ProcessEnv): R2Environment {
  return {
    bucket: requiredEnv(env, 'R2_BUCKET'),
    publicBaseUrl: requiredEnv(env, 'R2_PUBLIC_BASE_URL'),
    endpoint: requiredEnv(env, 'R2_ENDPOINT'),
    accessKeyId: requiredEnv(env, 'R2_ACCESS_KEY_ID'),
    secretAccessKey: requiredEnv(env, 'R2_SECRET_ACCESS_KEY'),
  };
}

function createR2Client(env: R2Environment): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value.$metadata?.httpStatusCode === 404 ||
    value.name === 'NotFound' ||
    value.name === 'NoSuchKey'
  );
}

function createR2ObjectPort(client: S3Client, bucket: string): GcsR2ObjectPort {
  return {
    async read(objectKey) {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        if (!response.Body) {
          throw new Error(`R2 object body is unavailable: ${objectKey}`);
        }
        return {
          body: Buffer.from(await response.Body.transformToByteArray()),
          metadata: Object.fromEntries(
            Object.entries(response.Metadata ?? {}).map(([key, value]) => [
              key.toLowerCase(),
              value,
            ]),
          ),
        };
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },
    async put({ objectKey, body, contentType, metadata }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: objectKey,
          IfNoneMatch: '*',
          Body: Buffer.from(body),
          ContentType: contentType,
          Metadata: metadata,
        }),
      );
    },
  };
}

async function fetchGcsSource(sourceUrl: string): Promise<{
  body: Uint8Array;
  contentType: string;
}> {
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`GCS fetch failed (${response.status}) for ${sourceUrl}`);
  }
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType:
      response.headers.get('content-type') || 'application/octet-stream',
  };
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function assertR2ObjectIdentity(
  object: { body: Uint8Array; metadata: Record<string, string> },
  objectKey: string,
  sourceIdentitySha256: string,
  contentSha256: string,
): void {
  const metadata = Object.fromEntries(
    Object.entries(object.metadata).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
  if (
    metadata[GCS_SOURCE_ID_METADATA] !== sourceIdentitySha256 ||
    metadata[GCS_CONTENT_METADATA] !== contentSha256
  ) {
    throw new Error(
      `Existing R2 object identity metadata is missing or does not match: ${objectKey}`,
    );
  }
  if (sha256(object.body) !== contentSha256) {
    throw new Error(
      `Existing R2 object content does not match the GCS source: ${objectKey}`,
    );
  }
}

export async function copyOrVerifyGcsUrl(
  objectPort: GcsR2ObjectPort,
  publicBaseUrl: string,
  sourceUrl: string,
  destinationUrl: string,
  skipCopy: boolean,
  fetchSource: GcsSourceFetcher = fetchGcsSource,
): Promise<void> {
  const location = parseGcsPublicUrl(sourceUrl);
  if (!location) throw new Error(`Not a GCS public URL: ${sourceUrl}`);
  const objectKey = buildGcsR2ObjectKey(location);
  const expectedDestination = buildR2PublicUrl(publicBaseUrl, objectKey);
  if (expectedDestination !== destinationUrl) {
    throw new Error(`R2 destination identity changed for ${sourceUrl}`);
  }

  const source = await fetchSource(sourceUrl);
  if (!source.body?.length) {
    throw new Error(`GCS source is empty: ${sourceUrl}`);
  }
  const sourceIdentitySha256 = sha256(
    `gcs://${location.bucket}/${location.objectKey}`,
  );
  const contentSha256 = sha256(source.body);
  const existing = await objectPort.read(objectKey);
  if (existing) {
    assertR2ObjectIdentity(
      existing,
      objectKey,
      sourceIdentitySha256,
      contentSha256,
    );
    return;
  }

  if (skipCopy) {
    throw new Error(
      `--skip-copy refused because the R2 object is absent: ${objectKey}`,
    );
  }
  await objectPort.put({
    objectKey,
    body: source.body,
    contentType: source.contentType,
    metadata: {
      [GCS_SOURCE_ID_METADATA]: sourceIdentitySha256,
      [GCS_CONTENT_METADATA]: contentSha256,
    },
  });
  const written = await objectPort.read(objectKey);
  if (!written) {
    throw new Error(`R2 object verification failed: ${objectKey}`);
  }
  assertR2ObjectIdentity(
    written,
    objectKey,
    sourceIdentitySha256,
    contentSha256,
  );
}

function mongoosePort(
  r2Client: S3Client | undefined,
  r2Env: R2Environment | undefined,
  skipCopy: boolean,
): GcsR2MigrationPort {
  const db = mongoose.connection.db!;
  const registry = db.collection<RegistryRow>('policy_media_asset_registry');
  const objectPort =
    r2Client && r2Env ? createR2ObjectPort(r2Client, r2Env.bucket) : undefined;
  return {
    scan(target) {
      return db.collection(target.collection).find({});
    },
    async findRegistryByHash(urlHash) {
      return registry.findOne({ url_hash: urlHash });
    },
    async copyOrVerify(sourceUrl, destinationUrl) {
      if (!objectPort || !r2Env) {
        throw new Error('Apply mode requires R2 credentials');
      }
      await copyOrVerifyGcsUrl(
        objectPort,
        r2Env.publicBaseUrl,
        sourceUrl,
        destinationUrl,
        skipCopy,
      );
    },
    async compareAndSet(collection, filter, set) {
      const result = await db
        .collection(collection)
        .updateOne(filter, { $set: set });
      return result.matchedCount === 1;
    },
  };
}

export async function main(
  argv = process.argv.slice(2),
  env = process.env,
): Promise<number> {
  const { dryRun, collection, skipCopy } = parseStoredMediaMigrationArgs(argv);
  const mongoUri = requiredEnv(env, 'MONGO_URI');
  const publicBaseUrl = requiredEnv(env, 'R2_PUBLIC_BASE_URL');
  const r2Env = dryRun ? undefined : requireR2ApplyEnv(env);
  const r2Client = r2Env ? createR2Client(r2Env) : undefined;

  console.log(
    `[migrate-stored-media] ${dryRun ? 'DRY RUN' : 'APPLY'}${collection ? ` (${collection})` : ''}`,
  );
  await mongoose.connect(mongoUri);
  try {
    if (!mongoose.connection.db) throw new Error('Mongo connection failed');
    const stats = await runStoredMediaMigration(
      mongoosePort(r2Client, r2Env, skipCopy),
      { dryRun, publicBaseUrl, collection },
    );
    console.log(JSON.stringify(stats, null, 2));
    return 0;
  } finally {
    await mongoose.disconnect();
  }
}

const directExecution =
  typeof require !== 'undefined' && typeof module !== 'undefined'
    ? require.main === module
    : process.argv[1]?.endsWith('migrate-stored-media-gcs-to-r2.ts');
if (directExecution) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error('[migrate-stored-media] fatal:', error);
      process.exitCode = 1;
    });
}
