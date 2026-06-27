import type { CheckWithdrawResponse } from "@mobile/api/walletTypes";

export type WithdrawMethodRecord = {
  _id: string;
  account_name: string;
  account_no: number | string;
  bank_name: string;
  bank_code?: string;
  is_default?: boolean;
};

export type WithdrawBankTransferRequest = {
  accountName: string;
  accountNumber: string;
  amountNet: number;
  bankName: string;
  currency?: "THB" | "USD";
};

export type WithdrawBankTransferResponse = {
  _id: string;
  status: string;
};

export type WithdrawBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  post<TResponse = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<TResponse>;
};

// Wired by CustomerMoneyActionScreen in backend mode. Real Nest paths:
// POST /withdraw/check, GET /withdraw/methods-list, POST /withdraw/bank-transfer.
export function createWithdrawApi(client: WithdrawBaseClient) {
  return {
    checkBalance() {
      return client.post<CheckWithdrawResponse>("/withdraw/check");
    },
    listMethods() {
      return client.get<WithdrawMethodRecord[]>("/withdraw/methods-list");
    },
    async submitBankTransfer(request: WithdrawBankTransferRequest, idempotencyKey: string) {
      if (!idempotencyKey) {
        throw new Error("submitBankTransfer requires an Idempotency-Key");
      }

      return client.post<WithdrawBankTransferResponse>(
        "/withdraw/bank-transfer",
        {
          account_name: request.accountName,
          account_number: request.accountNumber,
          amount_net: request.amountNet,
          amount_total: request.amountNet,
          bank_name: request.bankName,
          conversion_ids: [],
          currency: request.currency ?? "THB",
          percent_fee: 0,
        },
        {
          "Idempotency-Key": idempotencyKey,
        },
      );
    },
  };
}
