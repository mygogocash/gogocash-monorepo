/** Monthly quest points row (API returns `YYYY-MM`). */
export interface QuestMonthlyPointsRow {
  month: string;
  points: number;
}

export type QuestRewardHistoryType = "tier" | "social" | "bonus";

/** Reward line items for GoGoQuest History. */
export interface QuestRewardHistoryItem {
  _id: string;
  title: string;
  description?: string;
  points?: number;
  grantedAt: string;
  type: QuestRewardHistoryType;
}

export interface QuestHistorySummary {
  monthly: QuestMonthlyPointsRow[];
  rewards: QuestRewardHistoryItem[];
}

/** Public-ish summary for another user over a date range (leaderboard “View”). */
export interface QuestUserPeriodSummary {
  user_id: string;
  username: string;
  point: number;
  rank: number;
  rewards: QuestRewardHistoryItem[];
}
