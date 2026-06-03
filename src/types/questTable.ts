export type QuestTaskType = "offer" | "merchant";
export type QuestCompletionLimit = "once" | "multiple";

export interface QuestTaskCondition {
  operator: "<" | ">" | "=" | ">=" | "<=";
  metric: "sale" | "conversion";
  amount: number;
  currency: string;
}

/** Task summary for display in Quest details (no logo/file fields) */
export interface QuestTaskDisplay {
  /** Stable client id used as the React key while editing (reorder/remove). */
  id?: string;
  taskType: QuestTaskType;
  offerId?: string;
  merchantId?: string;
  offerName?: string;
  merchantName?: string;
  points: number;
  completionLimit: QuestCompletionLimit;
  condition: QuestTaskCondition | null;
  link: string;
}

/** Quest with optional links and tasks for details modal */
export interface QuestDetails extends Record<string, unknown> {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  rewardStatus: string;
  facebookPage: string;
  facebookPost: string;
  line: string;
  bannerEn: string;
  bannerTh: string;
  subBannerEn: string;
  subBannerTh: string;
  facebookPageLink?: string;
  facebookPostLink?: string;
  lineLink?: string;
  tasks?: QuestTaskDisplay[];
}
