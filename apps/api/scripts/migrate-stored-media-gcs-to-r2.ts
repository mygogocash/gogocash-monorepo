import 'dotenv/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import mongoose from 'mongoose';

import {
  classifyStoredMediaValue,
  parseGcsPublicUrl,
  rewriteGcsPublicUrlToR2,
} from '../src/media/stored-media.util';
import { STORED_MEDIA_TARGET_SPECS } from './stored-media-targets';

type MigrationStats = {
  dryRun: boolean;
  scanned: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: Array<{ collection: string; id: string; field: string; error: string }>;
};

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
    collection: argv.find((arg) => arg.startsWith('--collection='))?.split('=')[1],
    skipCopy: argv.includes('--skip-copy'),
  };
}

function requireR2Env() {
  const bucket = process.env.R2_BUCKET?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !endpoint || !publicBaseUrl || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_BASE_URL, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required',
    );
  }
  return { bucket, endpoint, publicBaseUrl, accessKeyId, secretAccessKey };
}

function createR2Client(env: ReturnType<typeof requireR2Env>): S3Client {
  return new S3Client({
    region: process.env.R2_REGION?.trim() || 'auto',
    endpoint: env.endpoint,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
}

async function r2ObjectExists(
  client: S3Client,
  bucket: string,
  objectKey: string,
): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
    return true;
  } catch {
    return false;
  }
}

async function copyGcsUrlToR2(
  client: S3Client,
  env: ReturnType<typeof requireR2Env>,
  gcsUrl: string,
  dryRun: boolean,
  skipCopy: boolean,
): Promise<string> {
  const location = parseGcsPublicUrl(gcsUrl);
  if (!location) {
    throw new Error('Not a GCS public URL');
  }

  const nextUrl = rewriteGcsPublicUrlToR2(gcsUrl, env.publicBaseUrl);
  if (!nextUrl) {
    throw new Error('Could not rewrite GCS URL to R2');
  }

  if (dryRun || skipCopy) {
    return nextUrl;
  }

  const exists = await r2ObjectExists(client, env.bucket, location.objectKey);
  if (!exists) {
    const response = await fetch(gcsUrl);
    if (!response.ok) {
      throw new Error(`GCS fetch failed (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    await client.send(
      new PutObjectCommand({
        Bucket: env.bucket,
        Key: location.objectKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  return nextUrl;
}

async function migrateDocumentField(
  client: S3Client,
  env: ReturnType<typeof requireR2Env>,
  value: unknown,
  dryRun: boolean,
  skipCopy: boolean,
): Promise<string | null> {
  if (classifyStoredMediaValue(value) !== 'gcs') {
    return null;
  }
  return copyGcsUrlToR2(client, env, String(value).trim(), dryRun, skipCopy);
}

async function main() {
  const { dryRun, collection: onlyCollection, skipCopy } = parseArgs(
    process.argv.slice(2),
  );
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  const r2Env = requireR2Env();
  const r2Client = createR2Client(r2Env);
  const stats: MigrationStats = {
    dryRun,
    scanned: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Mongo connection failed');
  }

  for (const target of STORED_MEDIA_TARGET_SPECS) {
    if (onlyCollection && target.collection !== onlyCollection) {
      continue;
    }

    const collection = db.collection(target.collection);
    const docs = await collection.find({}).toArray();

    for (const doc of docs) {
      const updates: Record<string, unknown> = {};
      const arrayUpdates: Record<string, unknown[]> = {};

      for (const field of target.fields) {
        const current = doc[field];
        stats.scanned += 1;
        if (classifyStoredMediaValue(current) !== 'gcs') {
          stats.skipped += 1;
          continue;
        }
        try {
          const next = await migrateDocumentField(
            r2Client,
            r2Env,
            current,
            dryRun,
            skipCopy,
          );
          if (next) {
            updates[field] = next;
            stats.migrated += 1;
          }
        } catch (error) {
          stats.failed += 1;
          stats.errors.push({
            collection: target.collection,
            id: String(doc._id),
            field,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      for (const field of target.arrayFields ?? []) {
        const values = Array.isArray(doc[field]) ? doc[field] : [];
        const nextValues: unknown[] = [];
        let changed = false;
        for (const value of values) {
          stats.scanned += 1;
          if (classifyStoredMediaValue(value) !== 'gcs') {
            nextValues.push(value);
            stats.skipped += 1;
            continue;
          }
          try {
            const next = await migrateDocumentField(
              r2Client,
              r2Env,
              value,
              dryRun,
              skipCopy,
            );
            nextValues.push(next ?? value);
            if (next) {
              changed = true;
              stats.migrated += 1;
            }
          } catch (error) {
            nextValues.push(value);
            stats.failed += 1;
            stats.errors.push({
              collection: target.collection,
              id: String(doc._id),
              field,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (changed) {
          arrayUpdates[field] = nextValues;
        }
      }

      const setPayload = { ...updates, ...arrayUpdates };
      if (Object.keys(setPayload).length > 0 && !dryRun) {
        await collection.updateOne({ _id: doc._id }, { $set: setPayload });
      }
    }
  }

  console.log(JSON.stringify(stats, null, 2));
  await mongoose.disconnect();

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
