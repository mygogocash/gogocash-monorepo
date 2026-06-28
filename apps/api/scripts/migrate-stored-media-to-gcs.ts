import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import mongoose from 'mongoose';

import {
  buildGcsPublicUrl,
  classifyStoredMediaValue,
  isLegacyGoogleDriveFileId,
} from '../src/media/stored-media.util';
import { MEDIA_FOLDER } from '../src/media/media-folders.config';

type TargetSpec = {
  collection: string;
  folder: (typeof MEDIA_FOLDER)[keyof typeof MEDIA_FOLDER];
  fields: string[];
  arrayFields?: string[];
};

const TARGETS: TargetSpec[] = [
  {
    collection: 'banners',
    folder: MEDIA_FOLDER.BANNER_HOME,
    fields: ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'],
  },
  {
    collection: 'offers',
    folder: MEDIA_FOLDER.BRANDS,
    fields: [
      'logo',
      'logo_desktop',
      'logo_mobile',
      'logo_circle',
      'banner',
      'banner_mobile',
    ],
  },
  { collection: 'categories', folder: MEDIA_FOLDER.CATEGORIES, fields: ['image'] },
  {
    collection: 'quests',
    folder: MEDIA_FOLDER.QUESTS,
    fields: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'],
  },
];

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes('--dry-run'),
    collection: argv.find((arg) => arg.startsWith('--collection='))?.split('=')[1],
  };
}

function bucketName() {
  return process.env.GCS_CATALOG_BUCKET?.trim() || 'gogocash-catalog-staging';
}

function publicBaseUrl() {
  const bucket = bucketName();
  return (
    process.env.GCS_CATALOG_PUBLIC_BASE_URL?.trim() ||
    `https://storage.googleapis.com/${bucket}`
  );
}

async function downloadLegacyDrive(fileId: string): Promise<Buffer> {
  const response = await fetch(
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
  );
  if (!response.ok) {
    throw new Error(`Drive download failed (${response.status}) for ${fileId}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function migrateValue(
  storage: Storage,
  folder: string,
  value: unknown,
  dryRun: boolean,
): Promise<string | null> {
  if (classifyStoredMediaValue(value) !== 'drive_id') {
    return null;
  }

  const fileId = String(value).trim();
  const objectKey = `${folder}/${Date.now()}-${fileId}.bin`;
  const nextUrl = buildGcsPublicUrl(publicBaseUrl(), objectKey);

  if (dryRun) {
    console.log(`[dry-run] ${fileId} -> ${nextUrl}`);
    return nextUrl;
  }

  const buffer = await downloadLegacyDrive(fileId);
  const bucket = storage.bucket(bucketName());
  const object = bucket.file(objectKey);
  await object.save(buffer, {
    contentType: 'application/octet-stream',
    resumable: false,
  });
  await object.makePublic();
  return nextUrl;
}

async function main() {
  const { dryRun, collection: onlyCollection } = parseArgs(process.argv.slice(2));
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Mongo connection failed');
  }

  const storage = new Storage();
  let migrated = 0;

  for (const target of TARGETS) {
    if (onlyCollection && target.collection !== onlyCollection) {
      continue;
    }

    const collection = db.collection(target.collection);
    const docs = await collection.find({}).toArray();

    for (const doc of docs) {
      const updates: Record<string, unknown> = {};

      for (const field of target.fields) {
        const current = doc[field];
        if (!isLegacyGoogleDriveFileId(String(current ?? ''))) {
          continue;
        }
        const next = await migrateValue(storage, target.folder, current, dryRun);
        if (next) {
          updates[field] = next;
          migrated += 1;
        }
      }

      if (Object.keys(updates).length > 0 && !dryRun) {
        await collection.updateOne({ _id: doc._id }, { $set: updates });
      }
    }
  }

  console.log(JSON.stringify({ dryRun, migrated }));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
