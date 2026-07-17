import { describe, expect, it, vi } from "vitest";

import { createWithdrawApi, type WithdrawBaseClient } from "@mobile/withdraw/api";
import {
  mapWithdrawMethodRecordToPayoutMethod,
  parseAccountNumberForApi,
} from "@mobile/withdraw/payoutMethodModel";

function createBaseClient() {
  return {
    get: vi.fn(async () => []),
    patch: vi.fn(async () => ({
      message: "Withdraw method updated",
      data: { _id: "method-1", account_name: "Demo", account_no: "1", bank_name: "SCB" },
      status: "success",
    })),
    post: vi.fn(async () => ({ _id: "withdraw-1", status: "pending" })),
  } as WithdrawBaseClient & {
    get: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
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

  it("createMethod > posts to /withdraw/methods", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await api.createMethod({
      account_name: "Demo Shopper",
      account_no: "0012345678",
      bank_name: "Kasikorn Bank",
      bank_code: "004",
      is_default: true,
    });

    expect(client.post).toHaveBeenCalledWith("/withdraw/methods", {
      account_name: "Demo Shopper",
      account_no: "0012345678",
      bank_name: "Kasikorn Bank",
      bank_code: "004",
      is_default: true,
    });
  });

  it.each([
    ["0012345678", "0012345678"],
    [42, "42"],
    [1e3, "1000"],
  ])("account-number boundary > accepts %p as exact string %s", (input, expected) => {
    expect(parseAccountNumberForApi(input as never)).toBe(expected);
  });

  it.each([
    1.5,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "1e3",
    "12-34",
    " 1234",
  ])("account-number boundary > rejects invalid input %p", (input) => {
    expect(() => parseAccountNumberForApi(input as never)).toThrow(/account number/i);
  });

  it("legacy response boundary > normalizes a safe numeric account number", () => {
    expect(
      mapWithdrawMethodRecordToPayoutMethod({
        _id: "legacy-method",
        account_name: "Legacy Shopper",
        account_no: 1000,
        bank_name: "SCB",
      }).accountNo,
    ).toBe("1000");
  });

  it("legacy response boundary > rejects an unsafe numeric account number", () => {
    expect(() =>
      mapWithdrawMethodRecordToPayoutMethod({
        _id: "unsafe-method",
        account_name: "Unsafe Shopper",
        account_no: Number.MAX_SAFE_INTEGER + 1,
        bank_name: "SCB",
      }),
    ).toThrow(/account number/i);
  });

  it("updateMethod > patches /withdraw/methods/:id", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await api.updateMethod("method-1", { is_default: false });

    expect(client.patch).toHaveBeenCalledWith("/withdraw/methods/method-1", { is_default: false });
    expect(client.post).not.toHaveBeenCalled();
    expect(client.get).not.toHaveBeenCalled();
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

  it("submitBankTransfer > given non-positive amount > throws before post", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await expect(
      api.submitBankTransfer(
        {
          accountName: "A",
          accountNumber: "1",
          amountNet: 0,
          bankName: "Bank",
        },
        "idem-123",
      ),
    ).rejects.toThrow(/positive amount/);
    expect(client.post).not.toHaveBeenCalled();
  });

  it("submitBankTransfer > given blank bank fields > throws before post", async () => {
    const client = createBaseClient();
    const api = createWithdrawApi(client);

    await expect(
      api.submitBankTransfer(
        {
          accountName: "  ",
          accountNumber: "1",
          amountNet: 100,
          bankName: "Bank",
        },
        "idem-123",
      ),
    ).rejects.toThrow(/account name, number, and bank/);
    expect(client.post).not.toHaveBeenCalled();
  });
});
