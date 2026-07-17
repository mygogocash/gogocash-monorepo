import type {
  QuestRewardDistributionMode,
  QuestRewardPayload,
  QuestRewardSavePayload,
} from "@/types/quest";

export type RewardDraft = QuestRewardPayload & {
  clientId: string;
};

export type RewardDistributionDraft = {
  mode: QuestRewardDistributionMode;
  delayDays: number;
};

export function buildQuestRewardPayloads(
  rewards: RewardDraft[],
): QuestRewardPayload[] {
  return rewards
    .map((reward) => ({
      rank: Number(reward.rank),
      reward: Number(reward.reward),
      currency: (reward.currency?.trim() || "THB").toUpperCase(),
    }))
    .sort((a, b) => a.rank - b.rank);
}

export function buildQuestRewardSavePayload(
  rewards: RewardDraft[],
  distribution: RewardDistributionDraft,
): Omit<QuestRewardSavePayload, "expected_config_revision"> {
  return {
    rewards: buildQuestRewardPayloads(rewards),
    reward_distribution_mode: distribution.mode,
    reward_distribution_delay_days:
      distribution.mode === "after_days" ? Number(distribution.delayDays) : 0,
  };
}

export function validateQuestRewards(rewards: RewardDraft[]): string | null {
  const seen = new Set<number>();

  for (const reward of rewards) {
    const rank = Number(reward.rank);
    const amount = Number(reward.reward);
    const currency = reward.currency?.trim() || "THB";

    if (!Number.isInteger(rank) || rank < 1 || rank > 1000) {
      return "Reward rank must be an integer between 1 and 1,000.";
    }
    if (seen.has(rank)) return "A reward rank can only appear once.";
    seen.add(rank);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
      return "Reward amount must be zero or greater and no more than 1,000,000.";
    }
    if (!currency || currency.length > 12) {
      return "Reward currency is required and must be 12 characters or fewer.";
    }
  }

  return null;
}

export function validateQuestRewardDistribution(
  distribution: RewardDistributionDraft,
): string | null {
  if (
    distribution.mode !== "manual" &&
    distribution.mode !== "campaign_end" &&
    distribution.mode !== "after_days"
  ) {
    return "Reward distribution schedule is invalid.";
  }

  if (distribution.mode !== "after_days") return null;

  const delayDays = Number(distribution.delayDays);
  if (!Number.isInteger(delayDays) || delayDays < 1 || delayDays > 365) {
    return "Reward distribution delay must be between 1 and 365 days.";
  }

  return null;
}
