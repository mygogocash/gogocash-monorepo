import { describe, expect, it, vi } from "vitest";

import { createWithdrawApi, type WithdrawBaseClient } from "@mobile/withdraw/api";

function createBaseClient() {
  return {
    get: vi.fn(async () => []),
    post: vi.fn(async () => ({ _id: "withdraw-1", status: "pending" })),
  } as WithdrawBaseClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
}

describe("createWithdrawApi", () => {
  it("checkBalance > posts to /withdraw/check", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await api.checkBalance();

    expect(client.post).toHaveBeenCalledWith("/withdraw/check");
  });

  it("listMethods > gets /withdraw/methods-list", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await api.listMethods();

    expect(client.get).toHaveBeenCalledWith("/withdraw/methods-list");
  });

  it("submitBankTransfer > given idempotency key > posts bank-transfer body with header", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await api.submitBankTransfer(
      {
        accountName: "Kunanon Jarat",
        accountNumber: "0891234567",
        amountNet: 500,
        bankName: "PromptPay",
      },
      "idem-123",
    );

    expect(client.post).toHaveBeenCalledWith(
      "/withdraw/bank-transfer",
      {
        account_name: "Kunanon Jarat",
        account_number: "0891234567",
        amount_net: 500,
        amount_total: 500,
        bank_name: "PromptPay",
        conversion_ids: [],
        currency: "THB",
        percent_fee: 0,
      },
      { "Idempotency-Key": "idem-123" },
    );
  });

  it("submitBankTransfer > given missing idempotency key > throws before post", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await expect(
      api.submitBankTransfer(
        {
          accountName: "A",
          accountNumber: "1",
          amountNet: 100,
          bankName: "Bank",
        },
        "",
      ),
    ).rejects.toThrow(/Idempotency-Key/);
    expect(client.post).not.toHaveBeenCalled();
  });
});
