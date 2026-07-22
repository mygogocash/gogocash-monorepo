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
 *    --confirm-quest and --confirm-leaderboard-hash.
 *  - Writes NOTHING to Mongo/ledger. Never a @Cron/@Interval/@Timeout.
 *  - Forces the quest-range leaderboard (the non-prod latest_available
 *    fallback in getQuestAdminLeaderboard is bypassed by calling
 *    getQuestRankListOfPoint directly).
 *  - Refuses on leaderboard drift between two independent reads.
 *
 * All money logic lives in src/tasks/legacy-reward-evidence-generator.ts; this
 * file is thin glue.
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
  computeLeaderboardSnapshotHash,
  selectFundedRankEntries,
  type GeneratorQuestReward,
  type LeaderboardEntryInput,
} from 'src/tasks/legacy-reward-evidence-generator';

interface CliOptions {
  mode: 'dry-run' | 'apply';
  questId: string;
  reviewedBy: string;
  reviewReference: string;
  out?: string;
  confirmQuest?: string;
  confirmLeaderboardHash?: string;
  allowZeroPointWinners: boolean;
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
  };

  if (options.mode === 'apply') {
    if (!options.out) throw new Error('--apply requires --out=<path>');
    if (!options.confirmQuest || !options.confirmLeaderboardHash) {
      throw new Error(
        '--apply requires --confirm-quest and --confirm-leaderboard-hash',
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

async function main() {
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

    const quest = await questModel
      .findById(new Types.ObjectId(options.questId))
      .lean();
    if (!quest) throw new Error(`Quest ${options.questId} not found`);

    // Force the quest window (the latest_available fallback is never invoked).
    const startDate = formatQuestWindowDate(quest.start_date);
    const endDate = formatQuestWindowDate(quest.end_date);
    if (!startDate || !endDate) {
      throw new Error('Refuse: quest is missing a valid start_date/end_date');
    }
    const status = deriveQuestStatus(quest.start_date, quest.end_date);
    const rewards = ((quest.rewards ?? []) as GeneratorQuestReward[]).map(
      (reward) => ({
        rank: Number(reward.rank),
        reward: Number(reward.reward),
        currency: reward.currency,
      }),
    );

    // Drift check: two independent reads must agree on the funded-rank slice.
    const firstRead = await pointService.getQuestRankListOfPoint(
      startDate,
      endDate,
    );
    const secondRead = await pointService.getQuestRankListOfPoint(
      startDate,
      endDate,
    );
    const firstHash = computeLeaderboardSnapshotHash(
      selectFundedRankEntries(rewards, firstRead as LeaderboardEntryInput[]),
    );
    const secondHash = computeLeaderboardSnapshotHash(
      selectFundedRankEntries(rewards, secondRead as LeaderboardEntryInput[]),
    );
    if (firstHash !== secondHash) {
      throw new Error(
        `Refuse: leaderboard drifted between reads (${firstHash} vs ${secondHash}); rerun when the leaderboard is stable`,
      );
    }
    const leaderboardHash = firstHash;

    const specialRows = (
      await pointService.getSpacialPointNextRound(startDate, endDate)
    ).map((row: { user_id: unknown; special_point_next_round: number }) => ({
      user_id: String(row.user_id),
      amount: Number(row.special_point_next_round),
    }));

    const leaderboard: LeaderboardEntryInput[] = (
      firstRead as Array<{ user_id: unknown; point: number }>
    ).map((row) => ({
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
    const questObjectId = new Types.ObjectId(options.questId);
    const existingManifests = connection.db
      ? await connection.db
          .collection('legacyrewardmanifests')
          .find({ quest_id: { $in: [questObjectId, options.questId] } })
          .project({
            manifest_key: 1,
            reward_type: 1,
            manifest_hash: 1,
            status: 1,
          })
          .toArray()
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

    const report = {
      mode: options.mode,
      quest_id: options.questId,
      quest_status: status,
      window: { start_date: startDate, end_date: endDate },
      leaderboard_snapshot_hash: leaderboardHash,
      leaderboard_size: leaderboard.length,
      reviewed_by: options.reviewedBy,
      review_reference: options.reviewReference,
      allow_zero_point_winners: options.allowZeroPointWinners,
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
      process.stdout.write(
        `${JSON.stringify(
          {
            ...report,
            next_step: `Review, then re-run with --apply --out=<path> --confirm-quest=${options.questId} --confirm-leaderboard-hash=${leaderboardHash}`,
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    // --apply: still writes ONLY the evidence JSON file, never Mongo.
    if (options.confirmQuest !== options.questId) {
      throw new Error('--confirm-quest does not match --quest-id');
    }
    if (options.confirmLeaderboardHash !== leaderboardHash) {
      throw new Error(
        'Refuse: --confirm-leaderboard-hash does not match the freshly computed hash (leaderboard changed since dry-run)',
      );
    }
    const outPath = resolve(options.out!);
    await writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    process.stdout.write(
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
