import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { QuestReconciliationService } from 'src/quest-task-engine/quest-reconciliation.service';

function positiveInteger(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix));
  if (!raw) return fallback;
  const value = Number(raw.slice(prefix.length));
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) {
    throw new Error(`${name} must be an integer between 1 and 10000.`);
  }
  return value;
}

async function main() {
  if (process.env.QUEST_TASK_V2_ENABLED !== 'true') {
    throw new Error(
      'QUEST_TASK_V2_ENABLED=true is required for quest event reconciliation.',
    );
  }
  const limit = positiveInteger('limit', 500);
  const quarantineLimit = positiveInteger('quarantine-limit', 100);
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const reconciliation = app.get(QuestReconciliationService);
    const requeued_retryable = await reconciliation.requeueRetryable(limit);
    const repaired_outbox = await reconciliation.reconcileMissingOutbox(limit);
    const resolved_quarantine =
      await reconciliation.resolveAuthoritativeQuarantine(quarantineLimit);
    console.log(
      JSON.stringify(
        { requeued_retryable, repaired_outbox, resolved_quarantine },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
