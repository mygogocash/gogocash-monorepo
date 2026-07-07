import { webWithdrawMethodPage } from "@mobile/design/webDesignParity";

import type { WithdrawMethodRecord } from "./api";

export type PayoutMethod = {
  id: string;
  type: "promptpay" | "bank" | "crypto";
  bankName: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
  maskedAccount?: string;
};

export type PayoutMethodDraft = Omit<PayoutMethod, "id">;

const FIXTURE_ACCOUNT_NUMBERS: Record<string, string> = {
  "mock-kbank-default": "1234567890",
  "mock-bangkok-bank": "9876543210",
};

export function maskAccountNumber(accountNo: string): string {
  const digits = accountNo.replace(/\D/g, "");
  if (digits.length <= 4) {
    return accountNo;
  }
  return `****${digits.slice(-4)}`;
}

export function inferPayoutMethodType(bankName: string): PayoutMethod["type"] {
  if (bankName.toLowerCase().includes("promptpay")) {
    return "promptpay";
  }
  if (bankName.toLowerCase().includes("crypto")) {
    return "crypto";
  }
  return "bank";
}

export function resolveBankCode(bankName: string): string {
  const normalized = bankName.trim().toLowerCase();
  if (normalized.includes("kasikorn")) {
    return "004";
  }
  if (normalized.includes("bangkok bank")) {
    return "002";
  }
  if (normalized.includes("promptpay")) {
    return "PP";
  }
  return "000";
}

export function parseAccountNumberForApi(accountNo: string): number {
  const digits = accountNo.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Account number is required.");
  }
  const parsed = Number(digits);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Account number must be numeric.");
  }
  return parsed;
}

export function mapWithdrawMethodRecordToPayoutMethod(record: WithdrawMethodRecord): PayoutMethod {
  const accountNo = String(record.account_no);
  return {
    id: record._id,
    type: inferPayoutMethodType(record.bank_name),
    bankName: record.bank_name,
    accountNo,
    accountName: record.account_name,
    isDefault: record.is_default ?? false,
    maskedAccount: maskAccountNumber(accountNo),
  };
}

export function buildFixturePayoutMethods(): PayoutMethod[] {
  return webWithdrawMethodPage.methods.map((method) => {
    const accountNo = FIXTURE_ACCOUNT_NUMBERS[method.id] ?? "0000000000";
    return {
      id: method.id,
      type: "bank" as const,
      bankName: method.bankName,
      accountNo,
      accountName: method.accountName,
      isDefault: method.isDefault,
      maskedAccount: method.maskedAccount,
    };
  });
}

export function mergePayoutMethodSave(
  methods: readonly PayoutMethod[],
  draft: PayoutMethodDraft,
  existingId?: string,
): { methods: PayoutMethod[]; saved: PayoutMethod } {
  const saved: PayoutMethod = {
    ...draft,
    id: existingId ?? crypto.randomUUID(),
    maskedAccount: draft.maskedAccount ?? maskAccountNumber(draft.accountNo),
  };

  const withoutExisting = existingId
    ? methods.filter((method) => method.id !== existingId)
    : methods;

  const normalized = saved.isDefault
    ? withoutExisting.map((method) => ({ ...method, isDefault: false }))
    : withoutExisting;

  return { methods: [...normalized, saved], saved };
}
