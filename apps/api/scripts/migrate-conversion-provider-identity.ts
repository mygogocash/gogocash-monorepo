import { MongoClient } from 'mongodb';
import {
  migrateConversionProviderIdentity,
  ConversionMigrationCollection,
} from '../src/quest-task-engine/conversion-provider-index.migration';
import { migrateQuestTaskIndexes } from '../src/quest-task-engine/quest-task-index.migration';

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((value) => value.startsWith(prefix))
    ?.slice(prefix.length);
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required.');
  const apply = process.argv.includes('--apply');
  if (apply && process.env.QUEST_TASK_V2_ENABLED === 'true') {
    throw new Error(
      'Disable QUEST_TASK_V2_ENABLED and pause conversion writers before applying the index migration.',
    );
  }
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const database = client.db();
    if (apply && argument('confirm-database') !== database.databaseName) {
      throw new Error(
        `Apply requires --confirm-database=${database.databaseName}.`,
      );
    }
    const report = await migrateConversionProviderIdentity(
      database.collection(
        'conversions',
      ) as unknown as ConversionMigrationCollection,
      { apply },
    );
    const taskIndexReport = await migrateQuestTaskIndexes(database, { apply });
    console.log(
      JSON.stringify(
        {
          database: database.databaseName,
          ...report,
          ...taskIndexReport,
        },
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
