// Maps POST /withdraw/list-check into the wallet transaction feed. The endpoint
// returns the customer's FULL earning history (allConversions, every status)
// plus their withdrawals (withdrawList) — this folds both into one sorted list
// of rows the wallet screen renders. Pure + defensive: unknown/partial docs
// coerce to safe values so a malformed row can never crash the wallet.

export type WalletTxKind = "earn" | "withdraw";
export type WalletTxStatus = "success" | "pending" | "failed";

export type WalletTxRow = {
  id: string;
  ts: number;
  dateLabel: string;
  brand: string;
  info: string;
  kind: WalletTxKind;
  amount: string;
  currency: string;
  status: WalletTxStatus;
  statusLabel: string;
};

export type ListCheckStatusTotal = {
  status?: unknown;
  totalTHB?: unknown;
  totalUSD?: unknown;
  count?: unknown;
};

export type ListCheckResponse = {
  allConversions?: unknown;
  withdrawList?: unknown;
  /** Per conversion_status aggregates with server-side FX → THB/USD. */
  totalsByStatusAndCurrency?: readonly ListCheckStatusTotal[];
  /** Approved withdrawals already converted to THB. */
  withdrawSumThbApproved?: { netAmount?: unknown; count?: unknown };
  withdrawSumThbPending?: { netAmount?: unknown; count?: unknown };
};

/** True when the payload looks like a /withdraw/list-check response. */
export function isListCheckResponse(payload: unknown): payload is ListCheckResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const p = payload as Record<string, unknown>;
  return Array.isArray(p.allConversions) || Array.isArray(p.withdrawList);
}

function num(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function tsOf(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function formatSigned(amount: number, sign: "+" | "-"): string {
  const abs = Number.isFinite(amount) ? Math.abs(amount) : 0;
  return (
    sign +
    abs.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  );
}

function dateLabel(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Both conversions and withdrawals use the same status vocabulary.
function mapStatus(raw: string): WalletTxStatus {
  const s = raw.toLowerCase();
  if (s === "approved" || s === "paid") return "success";
  if (s === "rejected" || s === "failed" || s === "cancelled") return "failed";
  return "pending";
}

const STATUS_LABEL: Record<WalletTxStatus, string> = {
  failed: "Failed",
  pending: "Pending",
  success: "Success",
};

const EARN_INFO: Record<WalletTxStatus, string> = {
  failed: "Order cancelled",
  pending: "Awaiting store confirmation",
  success: "Cashback confirmed",
};

function last4(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? ` ***${digits.slice(-4)}` : "";
}

function mapConversion(raw: unknown, i: number): WalletTxRow {
  const c = (raw ?? {}) as Record<string, unknown>;
  const status = mapStatus(str(c.conversion_status));
  const ts = tsOf(c.datetime_conversion ?? c.createdAt);
  const amount = num(c.payoutNew ?? c.payout ?? c.base_payout);
  return {
    amount: formatSigned(amount, "+"),
    brand: str(c.offer_name) || "Cashback",
    currency: str(c.currency) || "THB",
    dateLabel: dateLabel(ts),
    id: `conv-${c.conversion_id ?? c._id ?? i}`,
    info: EARN_INFO[status],
    kind: "earn",
    status,
    statusLabel: STATUS_LABEL[status],
    ts,
  };
}

function withdrawBrand(w: Record<string, unknown>): string {
  const bank = str(w.bank_name);
  if (bank) return `Withdraw to ${bank}${last4(str(w.account_number))}`;
  const method = str(w.method);
  return method ? `Withdraw to ${method}` : "Withdraw";
}

function mapWithdraw(raw: unknown, i: number): WalletTxRow {
  const w = (raw ?? {}) as Record<string, unknown>;
  const status = mapStatus(str(w.status));
  const ts = tsOf(w.createdAt ?? w.updatedAt);
  const amount = num(w.amount_net ?? w.amount_total);
  const isBank = /bank/i.test(str(w.method)) || !!str(w.bank_name);
  return {
    amount: formatSigned(amount, "-"),
    brand: withdrawBrand(w),
    currency: str(w.currency) || "THB",
    dateLabel: dateLabel(ts),
    id: `wd-${w._id ?? i}`,
    info: isBank ? "Bank transfer" : "Crypto wallet",
    kind: "withdraw",
    status,
    statusLabel: STATUS_LABEL[status],
    ts,
  };
}

/**
 * Fold earnings + withdrawals into one date-descending transaction list. An
 * empty or malformed payload yields [] (a valid zero-transaction wallet), never
 * an error.
 */
export function mapListCheckToWalletTxRows(payload: unknown): WalletTxRow[] {
  if (!isListCheckResponse(payload)) return [];
  const conversions = Array.isArray(payload.allConversions) ? payload.allConversions : [];
  const withdrawals = Array.isArray(payload.withdrawList) ? payload.withdrawList : [];
  const rows = [
    ...conversions.map((c, i) => mapConversion(c, i)),
    ...withdrawals.map((w, i) => mapWithdraw(w, i)),
  ];
  return rows.sort((a, b) => b.ts - a.ts);
}
