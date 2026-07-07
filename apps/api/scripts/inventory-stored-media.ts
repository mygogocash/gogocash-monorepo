import 'dotenv/config';
import mongoose from 'mongoose';

import {
  classifyStoredMediaValue,
  StoredMediaKind,
} from '../src/media/stored-media.util';
import { STORED_MEDIA_TARGET_SPECS } from './stored-media-targets';

function emptyCounts(): Record<StoredMediaKind, number> {
  return {
    empty: 0,
    gcs: 0,
    local: 0,
    drive_id: 0,
    other: 0,
  };
}

function bump(counts: Record<StoredMediaKind, number>, kind: StoredMediaKind) {
  counts[kind] += 1;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Mongo connection failed');
  }

  const totals = emptyCounts();

  for (const spec of STORED_MEDIA_TARGET_SPECS) {
    const collection = db.collection(spec.collection);
    const docs = await collection.find({}).toArray();
    const counts = emptyCounts();

    for (const doc of docs) {
      for (const field of spec.fields) {
        bump(counts, classifyStoredMediaValue(doc[field]));
        bump(totals, classifyStoredMediaValue(doc[field]));
      }
      for (const field of spec.arrayFields ?? []) {
        const values = Array.isArray(doc[field]) ? doc[field] : [];
        for (const value of values) {
          bump(counts, classifyStoredMediaValue(value));
          bump(totals, classifyStoredMediaValue(value));
        }
      }
    }

    console.log(
      JSON.stringify({
        collection: spec.collection,
        documents: docs.length,
        counts,
      }),
    );
  }

  console.log(JSON.stringify({ totals }));
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
