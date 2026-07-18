import type { CheckWithdrawResponse } from "@mobile/api/walletTypes";

export type WithdrawMethodRecord = {
  _id: string;
  account_name: string;
  account_no: number | string;
  bank_name: string;
  bank_code?: string;
  is_default?: boolean;
};

export type CreateWithdrawMethodRequest = {
  account_no: string;
  account_name: string;
  bank_name: string;
  bank_code: string;
  is_default: boolean;
};

export type CreateWithdrawMethodResponse = {
  message: string;
  data: WithdrawMethodRecord;
  status: string;
};

export type WithdrawBankTransferRequest = {
  accountName: string;
  accountNumber: string;
  amountNet: number;
  bankName: string;
  currency?: "THB" | "USD";
  couponCode?: string;
};

export type WithdrawFeePreviewResponse = {
  available_balance: number;
  min_withdraw: number;
  base_fee: number;
  discount: number;
  final_fee: number;
  you_will_receive: number;
  remaining_cashback: number;
  currency: string;
  coupon?: { code: string; name: string; id?: string };
};

export type WithdrawBankTransferResponse = {
  _id: string;
  status: string;
};

export type WithdrawBaseClient = {
  get<TResponse = unknown>(path: string): Promise<TResponse>;
  patch<TResponse = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<TResponse>;
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
    createMethod(body: CreateWithdrawMethodRequest) {
      return client.post<CreateWithdrawMethodResponse>("/withdraw/methods", body);
    },
    updateMethod(id: string, body: Partial<CreateWithdrawMethodRequest>) {
      return client.patch<CreateWithdrawMethodResponse>(`/withdraw/methods/${id}`, body);
    },
    previewFee(body: {
      amount: number;
      currency?: "THB" | "USD";
      method?: string;
      couponCode?: string;
    }) {
      return client.post<WithdrawFeePreviewResponse>("/withdraw/preview-fee", {
        amount: body.amount,
        currency: body.currency ?? "THB",
        method: body.method ?? "bank_transfer",
        ...(body.couponCode?.trim()
          ? { coupon_code: body.couponCode.trim().toUpperCase() }
          : {}),
      });
    },
    async submitBankTransfer(request: WithdrawBankTransferRequest, idempotencyKey: string) {
      if (!idempotencyKey) {
        throw new Error("submitBankTransfer requires an Idempotency-Key");
      }

      const accountName = request.accountName.trim();
      const accountNumber = request.accountNumber.trim();
      const bankName = request.bankName.trim();
      if (!accountName || !accountNumber || !bankName) {
        throw new Error("submitBankTransfer requires account name, number, and bank");
      }
      if (!(request.amountNet > 0)) {
        throw new Error("submitBankTransfer requires a positive amount");
      }

      return client.post<WithdrawBankTransferResponse>(
        "/withdraw/bank-transfer",
        {
          account_name: accountName,
          account_number: accountNumber,
          amount_net: request.amountNet,
          amount_total: request.amountNet,
          bank_name: bankName,
          conversion_ids: [],
          currency: request.currency ?? "THB",
          percent_fee: 0,
          ...(request.couponCode?.trim()
            ? { coupon_code: request.couponCode.trim().toUpperCase() }
            : {}),
        },
        {
          "Idempotency-Key": idempotencyKey,
        },
      );
    },
  };
}
