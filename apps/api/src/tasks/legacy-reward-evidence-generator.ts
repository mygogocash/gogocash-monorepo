/**
 * PURE, additive derivation of the legacy-reward manifest EVIDENCE FILE.
 *
 * This module holds ALL of the money logic for turning a quest's leaderboard
 * into the JSON evidence a human currently hand-types. It performs NO I/O: no
 * Nest DI, no Mongo, no ledger writes. Its only output is a
 * `LegacyManifestResolutionEvidence` object (identical shape to the hand-typed
 * file) that a SEPARATE, unchanged, checksum-gated operator run of
 * resolve-legacy-reward-manifests.ts --apply consumes.
 *
 * It is deliberately CONSERVATIVE: any ambiguity about who wins a funded rank
 * (ties, drift) is a hard refuse (throw), never a fabricated winner.
 */
import { createHash } from 'node:crypto';
import { deriveQuestStatus, type QuestStatus } from '../point/quest-status';
import { isLegacyRewardModel } from './legacy-reward-identity';
import {
  LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
  type LegacyManifestResolutionEvidence,
  type LegacyManifestResolutionTypeEvidence,
} from './legacy-reward-manifest-resolution';

const HEX_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const RANK_MANIFEST_EMPTY_REASON =
  'derived_leaderboard_produced_no_funded_rank_winners';
const SPECIAL_MANIFEST_EMPTY_REASON =
  'no_users_qualified_for_special_next_round';

export interface GeneratorQuestReward {
  rank: number;
  reward: number;
  currency?: string;
}

export interface GeneratorQuestInput {
  _id: string;
  reward_model?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  rewards?: GeneratorQuestReward[];
}

export interface LeaderboardEntryInput {
  user_id: unknown;
  point: number;
}

export interface SpecialRowInput {
  user_id: unknown;
  amount: number;
}

export interface BuildLegacyRewardEvidenceArgs {
  quest: GeneratorQuestInput;
  /** Leaderboard rows, already sorted by point DESC (rank = index + 1). */
  leaderboard: LeaderboardEntryInput[];
  /** getSpacialPointNextRound rows mapped to { user_id, amount }. */
  specialRows: SpecialRowInput[];
  reviewedBy: string;
  reviewReference: string;
  /** Override the zero-point-winner refuse (explicit operator decision). */
  allowZeroPointWinners?: boolean;
  /** Explicit status; when omitted it is derived from the quest window. */
  status?: QuestStatus;
  now?: Date;
}

function requireHexId(value: unknown, label: string): string {
  const normalized = String(value ?? '').trim();
  if (!HEX_OBJECT_ID.test(normalized)) {
    throw new Error(
      `Refuse: ${label} is not a valid 24-char hex ObjectId (${normalized || 'empty'})`,
    );
  }
  return normalized;
}

function requireText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

/**
 * The leaderboard rows that back an emitted funded rank, in ascending rank
 * order. Positions beyond the leaderboard length are skipped (never
 * fabricated). This is the exact slice that determines the payout, so it is
 * what the CLI drift check hashes across two independent fetches.
 */
export function selectFundedRankEntries(
  rewards: GeneratorQuestReward[],
  leaderboard: LeaderboardEntryInput[],
): Array<{ user_id: string; point: number }> {
  const entries: Array<{ user_id: string; point: number }> = [];
  const sorted = [...rewards].sort((a, b) => Number(a.rank) - Number(b.rank));
  for (const reward of sorted) {
    const index = Number(reward.rank) - 1;
    const row = leaderboard[index];
    if (!row) continue;
    entries.push({ user_id: String(row.user_id), point: Number(row.point) });
  }
  return entries;
}

/** Order-sensitive sha256 of the funded-rank leaderboard slice. */
export function computeLeaderboardSnapshotHash(
  entries: Array<{ user_id: string; point: number }>,
): string {
  const canonical = entries.map((entry) => ({
    user_id: String(entry.user_id),
    point: Number(entry.point),
  }));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function assertLeaderboardSortedDesc(leaderboard: LeaderboardEntryInput[]) {
  for (let i = 1; i < leaderboard.length; i++) {
    if (Number(leaderboard[i].point) > Number(leaderboard[i - 1].point)) {
      throw new Error(
        'Refuse: leaderboard is not sorted by point descending; cannot derive ranks',
      );
    }
  }
}

/**
 * Validate the immutable quest rewards and return a rank -> {amount, currency}
 * map plus the funded ranks in ascending order.
 */
function normalizeRewards(rewards: GeneratorQuestReward[]) {
  if (rewards.length === 0) {
    throw new Error('Refuse: quest has no rank rewards configured');
  }
  const byRank = new Map<number, { amount: number; currency: string }>();
  for (const reward of rewards) {
    const rank = Number(reward.rank);
    if (!Number.isSafeInteger(rank) || rank < 1) {
      throw new Error(
        `Refuse: invalid rank ${String(reward.rank)} in quest.rewards`,
      );
    }
    if (byRank.has(rank)) {
      throw new Error(`Refuse: duplicate rank ${rank} in quest.rewards`);
    }
    const amount = Number(reward.reward);
    if (!Number.isFinite(amount)) {
      throw new Error(`Refuse: reward for rank ${rank} is not a finite number`);
    }
    if (amount < 0) {
      throw new Error(`Refuse: negative reward for rank ${rank} (${amount})`);
    }
    // The downstream 409 gate compares the reward currency WITHOUT uppercasing
    // it, while recipient currency is uppercased. So the quest must already
    // store a canonical uppercase currency or the evidence would be rejected.
    const rawCurrency = String(reward.currency || 'THB');
    const currency = rawCurrency.toUpperCase();
    if (rawCurrency !== currency) {
      throw new Error(
        `Refuse: non-canonical currency "${rawCurrency}" for rank ${rank}; store an uppercase currency on the quest first`,
      );
    }
    byRank.set(rank, { amount, currency });
  }
  const fundedRanks = [...byRank.keys()].sort((a, b) => a - b);
  return { byRank, fundedRanks };
}

/**
 * REFUSE when a set of users tied on an equal point value overlaps any funded
 * rank position. In that case the leaderboard order among the tied users is
 * arbitrary, so which of them occupies a funded rank (and thus who gets paid,
 * or paid a different amount) is ambiguous. Conservative by design: any tie
 * touching the funded region halts derivation for human adjudication.
 */
function assertNoTieStraddle(
  leaderboard: LeaderboardEntryInput[],
  byRank: Map<number, { amount: number; currency: string }>,
) {
  let i = 0;
  while (i < leaderboard.length) {
    const point = Number(leaderboard[i].point);
    let j = i;
    while (
      j + 1 < leaderboard.length &&
      Number(leaderboard[j + 1].point) === point
    ) {
      j++;
    }
    if (j > i) {
      let overlapsFunded = false;
      for (let k = i; k <= j; k++) {
        if (byRank.has(k + 1)) {
          overlapsFunded = true;
          break;
        }
      }
      if (overlapsFunded) {
        const cohort = leaderboard
          .slice(i, j + 1)
          .map((row) => String(row.user_id));
        throw new Error(
          `Refuse: tie-straddle at funded rank(s); tied cohort points=${point} users=[${cohort.join(', ')}]`,
        );
      }
    }
    i = j + 1;
  }
}

export function buildLegacyRewardEvidence(
  args: BuildLegacyRewardEvidenceArgs,
): LegacyManifestResolutionEvidence {
  const {
    quest,
    leaderboard,
    specialRows,
    allowZeroPointWinners = false,
    now,
  } = args;

  const questId = requireHexId(quest._id, 'quest _id');
  const reviewedBy = requireText(args.reviewedBy, 'reviewed_by');
  const reviewReference = requireText(args.reviewReference, 'review_reference');

  if (!isLegacyRewardModel(quest.reward_model)) {
    throw new Error(
      `Refuse: quest is not a legacy reward model (reward_model=${String(quest.reward_model)})`,
    );
  }

  const status =
    args.status ??
    deriveQuestStatus(
      (quest.start_date ?? '') as Date | string,
      (quest.end_date ?? '') as Date | string,
      now ?? new Date(),
    );
  if (status !== 'close') {
    throw new Error(
      `Refuse: quest status must be "close" to derive winners (got ${status})`,
    );
  }

  const { byRank, fundedRanks } = normalizeRewards(quest.rewards ?? []);

  assertLeaderboardSortedDesc(leaderboard);
  assertNoTieStraddle(leaderboard, byRank);

  // Build rank recipients: omit unfilled ranks, refuse zero-point winners.
  const rankRecipients: LegacyManifestResolutionTypeEvidence['recipients'] = [];
  const rankUsersSeen = new Set<string>();
  for (const rank of fundedRanks) {
    const row = leaderboard[rank - 1];
    if (!row) continue; // OMIT: fewer participants than ranks; never fabricate.
    const point = Number(row.point);
    if (point <= 0 && !allowZeroPointWinners) {
      throw new Error(
        `Refuse: rank ${rank} winner has non-positive leaderboard points (${point}); pass allowZeroPointWinners to override`,
      );
    }
    const userId = requireHexId(row.user_id, `rank ${rank} winner user_id`);
    if (rankUsersSeen.has(userId)) {
      throw new Error(
        `Refuse: user ${userId} would occupy more than one funded rank`,
      );
    }
    rankUsersSeen.add(userId);
    const reward = byRank.get(rank)!;
    rankRecipients.push({
      user_id: userId,
      amount: reward.amount,
      rank,
      currency: reward.currency,
    });
  }

  // Build special-next-round recipients: no rank/currency, ever.
  const specialRecipients: LegacyManifestResolutionTypeEvidence['recipients'] =
    [];
  const specialUsersSeen = new Set<string>();
  for (const row of specialRows) {
    const userId = requireHexId(row.user_id, 'special-next-round user_id');
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(
        `Refuse: invalid special-next-round amount for ${userId} (${String(row.amount)})`,
      );
    }
    if (specialUsersSeen.has(userId)) {
      throw new Error(
        `Refuse: duplicate special-next-round recipient ${userId}`,
      );
    }
    specialUsersSeen.add(userId);
    specialRecipients.push({ user_id: userId, amount });
  }

  const rankManifest: LegacyManifestResolutionTypeEvidence = {
    reward_type: 'rank',
    recipients: rankRecipients,
    ...(rankRecipients.length === 0
      ? { no_recipient_reason: RANK_MANIFEST_EMPTY_REASON }
      : {}),
  };
  const specialManifest: LegacyManifestResolutionTypeEvidence = {
    reward_type: 'special-next-round',
    recipients: specialRecipients,
    ...(specialRecipients.length === 0
      ? { no_recipient_reason: SPECIAL_MANIFEST_EMPTY_REASON }
      : {}),
  };

  return {
    quest_id: questId,
    reconciliation_version: 1,
    reviewed_by: reviewedBy,
    review_reference: reviewReference,
    completeness_attestation: LEGACY_MANIFEST_COMPLETENESS_ATTESTATION,
    manifests: [rankManifest, specialManifest],
  };
}
