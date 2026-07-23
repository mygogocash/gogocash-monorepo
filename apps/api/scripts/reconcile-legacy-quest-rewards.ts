import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import type { Db } from 'mongodb';
import {
  buildLegacyRewardReconciliationPlan,
  LegacyRewardReconciliationStore,
  LegacyRewardRollbackArtifact,
  runLegacyRewardRollback,
  runLegacyRewardReconciliation,
} from '../src/tasks/legacy-reward-reconciliation';
import { MongoLegacyRewardReconciliationStore } from '../src/tasks/legacy-reward-reconciliation.mongo';

export interface LegacyRewardCliOptions {
  mode: 'dry-run' | 'apply' | 'rollback';
  runId: string;
  confirmChecksum?: string;
  confirmTarget?: string;
  reportFile?: string;
}

const ABSENT_VALUE_MARKER = '__gogocash_legacy_reward_absent__';

export function stringifyLegacyRewardReport(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, nested) =>
      nested === undefined ? { [ABSENT_VALUE_MARKER]: true } : nested,
    2,
  );
}

function decodeAbsentValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeAbsentValues);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length === 1 &&
      record[ABSENT_VALUE_MARKER] === true
    ) {
      return undefined;
    }
    return Object.fromEntries(
      Object.entries(record).map(([key, nested]) => [
        key,
        decodeAbsentValues(nested),
      ]),
    );
  }
  return value;
}

export function parseLegacyRewardRollbackArtifact(
  json: string,
): LegacyRewardRollbackArtifact {
  return decodeAbsentValues(JSON.parse(json)) as LegacyRewardRollbackArtifact;
}

function optionValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

export function legacyRewardTargetFingerprint(uri: string): string {
  const parsed = /^(mongodb(?:\+srv)?):\/\/([^/?]+)(\/[^?]*)?(?:\?.*)?$/i.exec(
    uri.trim(),
  );
  if (!parsed) throw new Error('MONGO_URI is not a valid MongoDB URI');
  const authority = parsed[2];
  const credentialSeparator = authority.lastIndexOf('@');
  const hosts = authority.slice(credentialSeparator + 1).toLowerCase();
  const identity = `${parsed[1].toLowerCase()}://${hosts}${parsed[3] || '/'}`;
  return createHash('sha256').update(identity).digest('hex').slice(0, 16);
}

export function parseLegacyRewardCliArgs(
  argv: string[],
): LegacyRewardCliOptions {
  const hasApply = argv.includes('--apply');
  const hasDryRun = argv.includes('--dry-run');
  const hasRollback = argv.includes('--rollback');
  if ([hasApply, hasDryRun, hasRollback].filter(Boolean).length > 1) {
    throw new Error(
      'Choose either --apply, --dry-run, or --rollback (exactly one mode)',
    );
  }
  const mode = hasRollback ? 'rollback' : hasApply ? 'apply' : 'dry-run';
  const runId = optionValue(argv, 'run-id')?.trim() || randomUUID();
  const confirmChecksum = optionValue(argv, 'confirm-checksum')?.trim();
  const confirmTarget = optionValue(argv, 'confirm-target')?.trim();
  const reportFile = optionValue(argv, 'report-file')?.trim();
  if (mode !== 'dry-run' && (!confirmChecksum || !confirmTarget)) {
    throw new Error(
      `${mode === 'apply' ? '--apply' : '--rollback'} requires --confirm-checksum and --confirm-target`,
    );
  }
  if (mode === 'rollback' && !reportFile) {
    throw new Error(
      '--rollback requires --report-file=<confirmed apply report>',
    );
  }
  return {
    mode,
    runId,
    confirmChecksum,
    confirmTarget,
    ...(reportFile ? { reportFile: resolve(reportFile) } : {}),
  };
}

export async function executeLegacyRewardReconciliation(
  store: LegacyRewardReconciliationStore,
  options: LegacyRewardCliOptions,
  actualTargetFingerprint: string,
) {
  if (options.mode === 'rollback') {
    throw new Error('Use executeLegacyRewardRollback for rollback mode');
  }
  const snapshot = await store.readSnapshot();
  const plan = buildLegacyRewardReconciliationPlan(snapshot);
  if (options.mode === 'apply') {
    if (options.confirmChecksum !== plan.evidence_checksum) {
      throw new Error(
        'Evidence checksum changed after dry-run; no writes were attempted',
      );
    }
    if (options.confirmTarget !== actualTargetFingerprint) {
      throw new Error('Target fingerprint mismatch; no writes were attempted');
    }
  }
  const frozenSnapshotStore: LegacyRewardReconciliationStore = {
    readSnapshot: async () => snapshot,
    compareAndSet: (operation) => store.compareAndSet(operation),
    ...(store.ensureIndexes
      ? { ensureIndexes: () => store.ensureIndexes!() }
      : {}),
  };
  return runLegacyRewardReconciliation(frozenSnapshotStore, {
    mode: options.mode,
    runId: options.runId,
  });
}

export async function executeLegacyRewardRollback(
  store: LegacyRewardReconciliationStore,
  artifact: LegacyRewardRollbackArtifact,
  options: LegacyRewardCliOptions,
  actualTargetFingerprint: string,
) {
  if (options.mode !== 'rollback') throw new Error('Rollback mode is required');
  if (options.confirmTarget !== actualTargetFingerprint) {
    throw new Error('Target fingerprint mismatch; no writes were attempted');
  }
  if (options.confirmChecksum !== artifact.rollback_checksum) {
    throw new Error('Rollback checksum mismatch; no writes were attempted');
  }
  return runLegacyRewardRollback(store, artifact, { runId: options.runId });
}

async function main() {
  const options = parseLegacyRewardCliArgs(process.argv.slice(2));
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) throw new Error('MONGO_URI is required');
  const targetFingerprint = legacyRewardTargetFingerprint(uri);
  await mongoose.connect(uri, { autoIndex: false });
  try {
    if (!mongoose.connection.db) throw new Error('Mongo database unavailable');
    const store = new MongoLegacyRewardReconciliationStore(
      mongoose.connection.db as unknown as Db,
    );
    const report =
      options.mode === 'rollback'
        ? await executeLegacyRewardRollback(
            store,
            parseLegacyRewardRollbackArtifact(
              await readFile(options.reportFile!, 'utf8'),
            ),
            options,
            targetFingerprint,
          )
        : await executeLegacyRewardReconciliation(
            store,
            options,
            targetFingerprint,
          );
    process.stdout.write(
      `${stringifyLegacyRewardReport({ target_fingerprint: targetFingerprint, ...report })}\n`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(
      `[legacy-reward-reconciliation] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
