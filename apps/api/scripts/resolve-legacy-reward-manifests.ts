import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Db } from 'mongodb';
import mongoose from 'mongoose';
import {
  buildLegacyManifestResolutionPlan,
  LegacyManifestResolutionEvidence,
  LegacyManifestResolutionStore,
} from '../src/tasks/legacy-reward-manifest-resolution';
import { MongoLegacyManifestResolutionStore } from '../src/tasks/legacy-reward-manifest-resolution.mongo';
import { legacyRewardTargetFingerprint } from './reconcile-legacy-quest-rewards';

export interface LegacyManifestResolutionCliOptions {
  mode: 'dry-run' | 'apply';
  questId: string;
  evidenceFile: string;
  confirmChecksum?: string;
  confirmTarget?: string;
  confirmQuest?: string;
}

function optionValue(argv: string[], name: string) {
  const prefix = `--${name}=`;
  return argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

export function parseLegacyManifestResolutionArgs(
  argv: string[],
): LegacyManifestResolutionCliOptions {
  const hasApply = argv.includes('--apply');
  const hasDryRun = argv.includes('--dry-run');
  if (hasApply && hasDryRun) {
    throw new Error('Choose either --apply or --dry-run, not both');
  }
  const questId = optionValue(argv, 'quest-id');
  const evidenceFile = optionValue(argv, 'evidence-file');
  if (!questId || !evidenceFile) {
    throw new Error('--quest-id and --evidence-file are required');
  }
  const options: LegacyManifestResolutionCliOptions = {
    mode: hasApply ? 'apply' : 'dry-run',
    questId,
    evidenceFile: resolve(evidenceFile),
    confirmChecksum: optionValue(argv, 'confirm-checksum'),
    confirmTarget: optionValue(argv, 'confirm-target'),
    confirmQuest: optionValue(argv, 'confirm-quest'),
  };
  if (
    options.mode === 'apply' &&
    (!options.confirmChecksum ||
      !options.confirmTarget ||
      !options.confirmQuest)
  ) {
    throw new Error(
      '--apply requires --confirm-checksum, --confirm-target, and --confirm-quest',
    );
  }
  return options;
}

export async function executeLegacyManifestResolution(
  store: LegacyManifestResolutionStore,
  evidence: LegacyManifestResolutionEvidence,
  options: LegacyManifestResolutionCliOptions,
  targetFingerprint: string,
) {
  if (String(evidence.quest_id).trim() !== options.questId) {
    throw new Error('Evidence quest_id does not match --quest-id');
  }
  const snapshot = await store.readSnapshot(options.questId);
  const plan = buildLegacyManifestResolutionPlan(evidence, snapshot);
  if (options.mode === 'dry-run') {
    return { mode: options.mode, outcome: 'planned' as const, plan };
  }
  if (options.confirmQuest !== options.questId) {
    throw new Error('Confirmed quest does not match --quest-id');
  }
  if (options.confirmTarget !== targetFingerprint) {
    throw new Error('Confirmed target does not match the connected database');
  }
  if (options.confirmChecksum !== plan.plan_checksum) {
    throw new Error('Manifest resolution checksum changed after dry-run');
  }
  const outcome = await store.apply(plan);
  return { mode: options.mode, outcome, plan };
}

async function main() {
  const options = parseLegacyManifestResolutionArgs(process.argv.slice(2));
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) throw new Error('MONGO_URI is required');
  const evidence = JSON.parse(
    await readFile(options.evidenceFile, 'utf8'),
  ) as LegacyManifestResolutionEvidence;
  const targetFingerprint = legacyRewardTargetFingerprint(uri);
  await mongoose.connect(uri, { autoIndex: false });
  try {
    if (!mongoose.connection.db) throw new Error('Mongo database unavailable');
    const result = await executeLegacyManifestResolution(
      new MongoLegacyManifestResolutionStore(
        mongoose.connection.db as unknown as Db,
      ),
      evidence,
      options,
      targetFingerprint,
    );
    const manifests = result.plan.manifests.map((manifest) => ({
      manifest_key: manifest.manifest_key,
      manifest_hash: manifest.manifest_hash,
      included: manifest.recipients.filter((recipient) => !recipient.excluded)
        .length,
      excluded: manifest.recipients.filter((recipient) => recipient.excluded)
        .length,
      explicitly_empty: manifest.recipients.length === 0,
    }));
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: result.mode,
          outcome: result.outcome,
          quest_id: result.plan.quest_id,
          target_fingerprint: targetFingerprint,
          plan_checksum: result.plan.plan_checksum,
          evidence_checksum: result.plan.evidence_checksum,
          already_applied: result.plan.already_applied,
          manifests,
          next_step:
            'Rerun reconcile-legacy-quest-rewards.ts in dry-run mode; apply only its newly confirmed checksum and target.',
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
