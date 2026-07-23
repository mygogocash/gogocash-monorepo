/**
 * ADDITIVE, operator-invoked generator for the legacy-reward manifest EVIDENCE
 * FILE (the JSON a human currently hand-types). It DERIVES rank winners from
 * the quest leaderboard + special-next-round bonuses and emits the exact
 * `LegacyManifestResolutionEvidence` shape that the SEPARATE, unchanged,
 * checksum-gated resolve-legacy-reward-manifests.ts --apply consumes.
 *
 * Guarantees:
 *  - Gated behind QUEST_WINNER_GENERATOR_ENABLED=true (default OFF, opt-in).
 *  - Dry-run by default; writes the JSON file ONLY on --apply with matching
 *    --confirm-quest and --confirm-leaderboard-hash AND an explicit
 *    --attest-exclusions-reviewed governance attestation.
 *  - Writes NOTHING to Mongo/ledger. Never a @Cron/@Interval/@Timeout.
 *  - Forces the quest-range leaderboard (the non-prod latest_available
 *    fallback in getQuestAdminLeaderboard is bypassed by calling
 *    getQuestRankListOfPoint directly).
 *  - Refuses on ANY drift (funded-rank OR special-next-round slice) between two
 *    independent reads.
 *
 * All money logic lives in src/tasks/legacy-reward-evidence-generator.ts; the
 * orchestration + guardrails live in the exported runGenerate() (pure, IO
 * injected) so they are unit-tested in
 * src/tasks/generate-legacy-reward-evidence.cli.spec.ts. This file's main() is
 * only NestFactory bootstrap wiring the real Mongo/PointService IO deps.
 *
 * OPERATOR RUNBOOK (money-adjacent — run with maximum care):
 *   1. Run with CRON_ENABLED=false. main() bootstraps AppModule, which pulls in
 *      ScheduleModule; CRON_ENABLED=false keeps in-process @Cron wrappers from
 *      firing during a payout-adjacent run.
 *   2. Gate it on explicitly: QUEST_WINNER_GENERATOR_ENABLED=true.
 *   3. Dry-run first and READ the governance_warning: exclusions/KYC are NOT
 *      auto-derived. Review that set out-of-band.
 *   4. Re-run --apply --out=<path> --confirm-quest=<id>
 *      --confirm-leaderboard-hash=<hash-from-dry-run>
 *      --attest-exclusions-reviewed to write the evidence JSON only.
 *   5. Feed the JSON to resolve-legacy-reward-manifests.ts, which has its OWN
 *      checksum/target/quest confirmation gate before any ledger write.
 *
 *   Example:
 *     CRON_ENABLED=false QUEST_WINNER_GENERATOR_ENABLED=true \
 *       ts-node scripts/generate-legacy-reward-evidence.ts \
 *       --quest-id=<id> --reviewed-by=<ops> --review-reference=<ticket>
 */
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from 'src/app.module';
import { isQuestWinnerGeneratorEnabled } from 'src/common/quest-winner-generator-gate';
import { PointService } from 'src/point/point.service';
import { deriveQuestStatus } from 'src/point/quest-status';
import { Quest } from 'src/point/schemas/quest.schema';
import {
  buildLegacyRewardEvidence,
  computeGeneratorSnapshotHash,
  selectFundedRankEntries,
  type GeneratorQuestReward,
  type LeaderboardEntryInput,
} from 'src/tasks/legacy-reward-evidence-generator';
import type { LegacyManifestResolutionEvidence } from 'src/tasks/legacy-reward-manifest-resolution';

export interface CliOptions {
  mode: 'dry-run' | 'apply';
  questId: string;
  reviewedBy: string;
  reviewReference: string;
  out?: string;
  confirmQuest?: string;
  confirmLeaderboardHash?: string;
  allowZeroPointWinners: boolean;
  attestExclusionsReviewed: boolean;
}

/**
 * Loud, constant governance banner surfaced in every dry-run report. The
 * generator only derives leaderboard/special recipients; exclusions and
 * KYC/withdrawal holds are a human responsibility that --attest-exclusions-reviewed
 * attests to before --apply.
 */
export const GENERATOR_GOVERNANCE_WARNING =
  'GOVERNANCE: this generator derives recipients ONLY from the quest leaderboard ' +
  'and special-next-round bonuses. Exclusions and KYC/withdrawal holds are NOT ' +
  'auto-derived and are NOT reflected in this evidence. Before running --apply you ' +
  'MUST review the exclusion/KYC set out-of-band; passing --reviewed-by together with ' +
  '--attest-exclusions-reviewed attests that the recipient AND exclusion set were ' +
  'reviewed and are complete ' +
  '(completeness_attestation=reviewed_complete_recipient_and_exclusion_set).';

export interface GeneratorQuestDoc {
  _id: unknown;
  reward_model?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  rewards?: GeneratorQuestReward[];
}

export interface GeneratorExistingManifestDoc {
  manifest_key?: unknown;
  reward_type?: unknown;
  manifest_hash?: unknown;
  status?: unknown;
}

/** Injected IO seam so runGenerate's guardrails are unit-testable with mocks. */
export interface GenerateDeps {
  /** Defaults to process.env; gate is read from env.QUEST_WINNER_GENERATOR_ENABLED. */
  env?: NodeJS.ProcessEnv;
  /** Deterministic clock for status derivation; defaults to new Date(). */
  now?: Date;
  /** Sink for the JSON report; defaults to process.stdout.write. */
  stdout?: (chunk: string) => void;
  /** Path normaliser for the --out target; defaults to identity. */
  resolvePath?: (path: string) => string;
  loadQuest: (questId: string) => Promise<GeneratorQuestDoc | null>;
  fetchLeaderboard: (
    startDate: string,
    endDate: string,
  ) => Promise<Array<{ user_id: unknown; point: number }>>;
  fetchSpecial: (
    startDate: string,
    endDate: string,
  ) => Promise<Array<{ user_id: unknown; special_point_next_round: number }>>;
  fetchExistingManifests?: (
    questId: string,
  ) => Promise<GeneratorExistingManifestDoc[]>;
  /** Writes the evidence JSON. NEVER touches Mongo/ledger. */
  writeFile: (path: string, data: string) => Promise<void>;
}

export interface GenerateResult {
  mode: 'dry-run' | 'apply';
  leaderboardHash: string;
  evidence: LegacyManifestResolutionEvidence;
  report: Record<string, unknown>;
  wrote: boolean;
  outPath?: string;
}

function optionValue(argv: string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length)
    .trim();
}

export function parseArgs(argv: string[]): CliOptions {
  const hasApply = argv.includes('--apply');
  const hasDryRun = argv.includes('--dry-run');
  if (hasApply && hasDryRun) {
    throw new Error('Choose either --apply or --dry-run, not both');
  }
  const questId = optionValue(argv, 'quest-id');
  const reviewedBy = optionValue(argv, 'reviewed-by');
  const reviewReference = optionValue(argv, 'review-reference');
  if (!questId) throw new Error('--quest-id is required');
  if (!reviewedBy) throw new Error('--reviewed-by is required');
  if (!reviewReference) throw new Error('--review-reference is required');

  const options: CliOptions = {
    mode: hasApply ? 'apply' : 'dry-run',
    questId,
    reviewedBy,
    reviewReference,
    out: optionValue(argv, 'out'),
    confirmQuest: optionValue(argv, 'confirm-quest'),
    confirmLeaderboardHash: optionValue(argv, 'confirm-leaderboard-hash'),
    allowZeroPointWinners: argv.includes('--allow-zero-point-winners'),
    attestExclusionsReviewed: argv.includes('--attest-exclusions-reviewed'),
  };

  if (options.mode === 'apply') {
    if (!options.out) throw new Error('--apply requires --out=<path>');
    if (!options.confirmQuest || !options.confirmLeaderboardHash) {
      throw new Error(
        '--apply requires --confirm-quest and --confirm-leaderboard-hash',
      );
    }
    if (!options.attestExclusionsReviewed) {
      throw new Error(
        '--apply requires --attest-exclusions-reviewed (exclusions/KYC are not auto-derived; --reviewed-by attests the exclusion set was reviewed)',
      );
    }
  }
  return options;
}

/** Same one-liner as PointService.formatQuestDate (YYYY-MM-DD or ''). */
function formatQuestWindowDate(
  value: Date | string | null | undefined,
): string {
  const date = new Date(value as Date | string);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function mapSpecialEntries(
  rows: Array<{ user_id: unknown; special_point_next_round: number }>,
): Array<{ user_id: string; amount: number }> {
  return rows.map((row) => ({
    user_id: String(row.user_id),
    amount: Number(row.special_point_next_round),
  }));
}

/**
 * Pure orchestration + guardrails for the evidence generator. All IO is
 * injected via `deps`, so every guard below is unit-testable without Nest/Mongo:
 *   - QUEST_WINNER_GENERATOR_ENABLED opt-in gate (checked before ANY IO),
 *   - --apply requires the exclusion-review attestation,
 *   - drift refuse across two independent reads of BOTH payout slices,
 *   - --apply confirm-quest + confirm-leaderboard-hash equality refuse.
 * Returns without writing anything in dry-run mode.
 */
export async function runGenerate(
  options: CliOptions,
  deps: GenerateDeps,
): Promise<GenerateResult> {
  const env = deps.env ?? process.env;
  if (!isQuestWinnerGeneratorEnabled(env.QUEST_WINNER_GENERATOR_ENABLED)) {
    throw new Error(
      'QUEST_WINNER_GENERATOR_ENABLED=true is required to run the legacy reward evidence generator.',
    );
  }
  // Defense in depth (parseArgs also enforces this): --apply must carry the
  // explicit governance attestation before any leaderboard IO happens.
  if (options.mode === 'apply' && !options.attestExclusionsReviewed) {
    throw new Error(
      'Refuse: --apply requires --attest-exclusions-reviewed; --reviewed-by attests the recipient AND exclusion/KYC set were reviewed and are complete.',
    );
  }

  const now = deps.now ?? new Date();
  const stdout =
    deps.stdout ?? ((chunk: string) => void process.stdout.write(chunk));
  const resolvePath = deps.resolvePath ?? ((path: string) => path);

  const quest = await deps.loadQuest(options.questId);
  if (!quest) throw new Error(`Quest ${options.questId} not found`);

  // Force the quest window (the latest_available fallback is never invoked).
  const startDate = formatQuestWindowDate(quest.start_date);
  const endDate = formatQuestWindowDate(quest.end_date);
  if (!startDate || !endDate) {
    throw new Error('Refuse: quest is missing a valid start_date/end_date');
  }
  const status = deriveQuestStatus(
    (quest.start_date ?? '') as Date | string,
    (quest.end_date ?? '') as Date | string,
    now,
  );
  const rewards = ((quest.rewards ?? []) as GeneratorQuestReward[]).map(
    (reward) => ({
      rank: Number(reward.rank),
      reward: Number(reward.reward),
      currency: reward.currency,
    }),
  );

  // Drift check: two independent reads must agree on the funded-rank slice AND
  // the special-next-round slice. Any movement in either payout slice (a rank
  // winner shifting, or a special amount/recipient changing) is a hard refuse —
  // points still moving must never be turned into an evidence file.
  const firstLeaderboard = await deps.fetchLeaderboard(startDate, endDate);
  const firstSpecialRaw = await deps.fetchSpecial(startDate, endDate);
  const secondLeaderboard = await deps.fetchLeaderboard(startDate, endDate);
  const secondSpecialRaw = await deps.fetchSpecial(startDate, endDate);

  const firstHash = computeGeneratorSnapshotHash({
    fundedRankEntries: selectFundedRankEntries(
      rewards,
      firstLeaderboard as LeaderboardEntryInput[],
    ),
    specialEntries: mapSpecialEntries(firstSpecialRaw),
  });
  const secondHash = computeGeneratorSnapshotHash({
    fundedRankEntries: selectFundedRankEntries(
      rewards,
      secondLeaderboard as LeaderboardEntryInput[],
    ),
    specialEntries: mapSpecialEntries(secondSpecialRaw),
  });
  if (firstHash !== secondHash) {
    throw new Error(
      `Refuse: leaderboard/special slice drifted between reads (${firstHash} vs ${secondHash}); rerun when points have stopped moving`,
    );
  }
  const leaderboardHash = firstHash;

  const specialRows = mapSpecialEntries(firstSpecialRaw);
  const leaderboard: LeaderboardEntryInput[] = firstLeaderboard.map((row) => ({
    user_id: String(row.user_id),
    point: Number(row.point),
  }));

  const evidence = buildLegacyRewardEvidence({
    quest: {
      _id: String(quest._id),
      reward_model: quest.reward_model,
      start_date: quest.start_date,
      end_date: quest.end_date,
      rewards,
    },
    leaderboard,
    specialRows,
    reviewedBy: options.reviewedBy,
    reviewReference: options.reviewReference,
    allowZeroPointWinners: options.allowZeroPointWinners,
    status,
  });

  // Read-only diff against any manifests already persisted for this quest.
  const existingManifests = deps.fetchExistingManifests
    ? await deps.fetchExistingManifests(options.questId)
    : [];

  const manifestSummary = evidence.manifests.map((manifest) => ({
    reward_type: manifest.reward_type,
    recipients: manifest.recipients.length,
    amounts: manifest.recipients.map((recipient) => ({
      user_id: recipient.user_id,
      amount: recipient.amount,
      ...(recipient.rank !== undefined ? { rank: recipient.rank } : {}),
      ...(recipient.currency !== undefined
        ? { currency: recipient.currency }
        : {}),
    })),
    no_recipient_reason: manifest.no_recipient_reason ?? null,
  }));

  const report: Record<string, unknown> = {
    mode: options.mode,
    quest_id: options.questId,
    quest_status: status,
    window: { start_date: startDate, end_date: endDate },
    leaderboard_snapshot_hash: leaderboardHash,
    leaderboard_size: leaderboard.length,
    special_recipient_count: specialRows.length,
    reviewed_by: options.reviewedBy,
    review_reference: options.reviewReference,
    allow_zero_point_winners: options.allowZeroPointWinners,
    attest_exclusions_reviewed: options.attestExclusionsReviewed,
    governance_warning: GENERATOR_GOVERNANCE_WARNING,
    tie_report: 'no tie-straddle detected (derivation succeeded)',
    existing_manifests: existingManifests.map((doc) => ({
      manifest_key: doc.manifest_key,
      reward_type: doc.reward_type,
      manifest_hash: doc.manifest_hash,
      status: doc.status,
    })),
    existing_manifests_present: existingManifests.length > 0,
    manifests: manifestSummary,
    evidence,
  };

  if (options.mode === 'dry-run') {
    stdout(
      `${JSON.stringify(
        {
          ...report,
          next_step: `Review the governance_warning, then re-run with --apply --out=<path> --confirm-quest=${options.questId} --confirm-leaderboard-hash=${leaderboardHash} --attest-exclusions-reviewed`,
        },
        null,
        2,
      )}\n`,
    );
    return { mode: 'dry-run', leaderboardHash, evidence, report, wrote: false };
  }

  // --apply: still writes ONLY the evidence JSON file, never Mongo.
  if (options.confirmQuest !== options.questId) {
    throw new Error('--confirm-quest does not match --quest-id');
  }
  if (options.confirmLeaderboardHash !== leaderboardHash) {
    throw new Error(
      'Refuse: --confirm-leaderboard-hash does not match the freshly computed hash (leaderboard/special changed since dry-run)',
    );
  }
  const outPath = resolvePath(options.out!);
  await deps.writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`);
  stdout(
    `${JSON.stringify(
      {
        ...report,
        evidence_written_to: outPath,
        next_step: `Run resolve-legacy-reward-manifests.ts --dry-run --quest-id=${options.questId} --evidence-file=${outPath}, then --apply with ITS confirmed checksum/target/quest. This generator wrote no ledger rows.`,
      },
      null,
      2,
    )}\n`,
  );
  return {
    mode: 'apply',
    leaderboardHash,
    evidence,
    report,
    wrote: true,
    outPath,
  };
}

async function main() {
  // Fail closed BEFORE booting AppModule (which pulls in ScheduleModule): the
  // gate must be explicitly on or the tool refuses to do anything.
  if (!isQuestWinnerGeneratorEnabled()) {
    throw new Error(
      'QUEST_WINNER_GENERATOR_ENABLED=true is required to run the legacy reward evidence generator.',
    );
  }
  const options = parseArgs(process.argv.slice(2));
  if (!Types.ObjectId.isValid(options.questId)) {
    throw new Error('--quest-id is not a valid ObjectId');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const questModel = app.get<Model<Quest>>(getModelToken(Quest.name));
    const pointService = app.get(PointService);
    const connection = app.get<Connection>(getConnectionToken());

    await runGenerate(options, {
      loadQuest: async (questId) =>
        (await questModel
          .findById(new Types.ObjectId(questId))
          .lean()) as GeneratorQuestDoc | null,
      fetchLeaderboard: (startDate, endDate) =>
        pointService.getQuestRankListOfPoint(startDate, endDate) as Promise<
          Array<{ user_id: unknown; point: number }>
        >,
      fetchSpecial: (startDate, endDate) =>
        pointService.getSpacialPointNextRound(startDate, endDate) as Promise<
          Array<{ user_id: unknown; special_point_next_round: number }>
        >,
      fetchExistingManifests: async (questId) => {
        if (!connection.db) return [];
        const questObjectId = new Types.ObjectId(questId);
        return connection.db
          .collection('legacyrewardmanifests')
          .find({ quest_id: { $in: [questObjectId, questId] } })
          .project({
            manifest_key: 1,
            reward_type: 1,
            manifest_hash: 1,
            status: 1,
          })
          .toArray();
      },
      writeFile: (path, data) => writeFile(path, data, 'utf8'),
      resolvePath: resolve,
    });
  } finally {
    await app.close();
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
