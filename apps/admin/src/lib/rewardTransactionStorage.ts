import {
  resolveAdminPayoutStatus,
  type AdminPayoutStatus,
} from "@/lib/adminPayoutStatus";

export type RewardPayoutStatus = AdminPayoutStatus;

export type RewardTransactionRecord = {
  id: string;
  rewardName: string;
  rewardAmount: number;
  rewardCurrency: string;
  rewardUser: string;
  payoutStatus: RewardPayoutStatus;
  createdAt: string;
  givenAt: string | null;
  errorMessage?: string;
};

const STORAGE_KEY = "gogocash.admin.rewardTransactions";

export function resolveRewardPayoutStatus(
  formStatus: RewardPayoutStatus,
  apiSuccess: boolean,
): RewardPayoutStatus {
  return resolveAdminPayoutStatus(formStatus, apiSuccess);
}

export function buildRewardTransactionRecord(input: {
  rewardName: string;
  rewardAmount: number;
  rewardCurrency: string;
  rewardUser: string;
  formStatus: RewardPayoutStatus;
  apiSuccess: boolean;
  errorMessage?: string;
  now?: Date;
}): RewardTransactionRecord {
  const createdAt = (input.now ?? new Date()).toISOString();
  const payoutStatus = resolveRewardPayoutStatus(
    input.formStatus,
    input.apiSuccess,
  );
  return {
    id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rewardName: input.rewardName.trim(),
    rewardAmount: input.rewardAmount,
    rewardCurrency: input.rewardCurrency.trim().toUpperCase(),
    rewardUser: input.rewardUser.trim(),
    payoutStatus,
    createdAt,
    givenAt: payoutStatus === "Given" ? createdAt : null,
    errorMessage: input.errorMessage?.trim() || undefined,
  };
}

export function loadRewardTransactions(): RewardTransactionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { entries?: RewardTransactionRecord[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

export function saveRewardTransactions(
  entries: RewardTransactionRecord[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }));
}

export function appendRewardTransaction(
  record: RewardTransactionRecord,
): RewardTransactionRecord[] {
  const next = [record, ...loadRewardTransactions()];
  saveRewardTransactions(next);
  return next;
}
