import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { migrateDashboardIndexes } from '../src/admin/dashboard/dashboard-index.migration';
import type { DashboardIndexDatabase } from '../src/admin/dashboard/dashboard-index.migration';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function sanitizedMongoTarget(uri: string): {
  hosts: string;
  database: string | null;
} {
  const match = /^mongodb(?:\+srv)?:\/\/([^/?]+)(?:\/([^?]*))?(?:\?.*)?$/i.exec(
    uri.trim(),
  );
  if (!match) throw new Error('MONGO_URI is not a valid MongoDB URI.');
  const hosts = match[1].slice(match[1].lastIndexOf('@') + 1).toLowerCase();
  const database = match[2] ? decodeURIComponent(match[2]).trim() : '';
  return { hosts, database: database || null };
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required.');

  const apply = process.argv.includes('--apply');
  const configuredTarget = sanitizedMongoTarget(uri);
  if (apply && !configuredTarget.database) {
    throw new Error(
      'Apply requires MONGO_URI to include an explicit database name; an implicit MongoDB default is not safe.',
    );
  }
  const expectedTarget = `${configuredTarget.hosts}/${configuredTarget.database ?? 'test'}`;
  if (apply && argument('confirm-target') !== expectedTarget) {
    throw new Error(`Apply requires --confirm-target=${expectedTarget}.`);
  }
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const database = client.db();
    if (
      configuredTarget.database &&
      configuredTarget.database !== database.databaseName
    ) {
      throw new Error(
        'Connected database does not match the explicit MONGO_URI database.',
      );
    }
    const report = await migrateDashboardIndexes(
      database as unknown as DashboardIndexDatabase,
      { apply },
    );
    console.log(
      JSON.stringify(
        { target: expectedTarget, database: database.databaseName, ...report },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
