import 'dotenv/config';
import mongoose from 'mongoose';

import {
  classifyStoredMediaValue,
  StoredMediaKind,
} from '../src/media/stored-media.util';

type FieldSpec = {
  collection: string;
  fields: string[];
  arrayFields?: string[];
};

const SPECS: FieldSpec[] = [
  {
    collection: 'banners',
    fields: ['image_1', 'image_2', 'image_3', 'image_4', 'image_5'],
  },
  {
    collection: 'offers',
    fields: [
      'logo',
      'logo_desktop',
      'logo_mobile',
      'logo_circle',
      'banner',
      'banner_mobile',
    ],
  },
  { collection: 'categories', fields: ['image'] },
  {
    collection: 'quests',
    fields: ['banner_en', 'banner_th', 'sub_banner_en', 'sub_banner_th'],
  },
  { collection: 'withdraws', fields: ['slip_file'] },
  { collection: 'missionorders', fields: [], arrayFields: ['attachments'] },
];

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

  const totals: Record<StoredMediaKind, number> = {
    empty: 0,
    gcs: 0,
    drive_id: 0,
    other: 0,
  };

  for (const spec of SPECS) {
    const collection = db.collection(spec.collection);
    const docs = await collection.find({}).toArray();
    const counts: Record<StoredMediaKind, number> = {
      empty: 0,
      gcs: 0,
      drive_id: 0,
      other: 0,
    };

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
