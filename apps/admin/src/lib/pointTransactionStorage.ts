import {
  resolveAdminPayoutStatus,
  type AdminPayoutStatus,
} from "@/lib/adminPayoutStatus";

export type PointTransactionRecord = {
  id: string;
  pointName: string;
  pointAmount: number;
  pointUser: string;
  payoutStatus: AdminPayoutStatus;
  createdAt: string;
  givenAt: string | null;
  errorMessage?: string;
};

const STORAGE_KEY = "gogocash.admin.pointTransactions";

export function buildPointTransactionRecord(input: {
  pointName: string;
  pointAmount: number;
  pointUser: string;
  formStatus: AdminPayoutStatus;
  apiSuccess: boolean;
  errorMessage?: string;
  now?: Date;
}): PointTransactionRecord {
  const createdAt = (input.now ?? new Date()).toISOString();
  const payoutStatus = resolveAdminPayoutStatus(
    input.formStatus,
    input.apiSuccess,
  );
  return {
    id: `point-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pointName: input.pointName.trim(),
    pointAmount: input.pointAmount,
    pointUser: input.pointUser.trim(),
    payoutStatus,
    createdAt,
    givenAt: payoutStatus === "Given" ? createdAt : null,
    errorMessage: input.errorMessage?.trim() || undefined,
  };
}

export function loadPointTransactions(): PointTransactionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { entries?: PointTransactionRecord[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

export function savePointTransactions(entries: PointTransactionRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries }));
}

export function appendPointTransaction(
  record: PointTransactionRecord,
): PointTransactionRecord[] {
  const next = [record, ...loadPointTransactions()];
  savePointTransactions(next);
  return next;
}
