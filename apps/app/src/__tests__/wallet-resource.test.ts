import { describe, expect, it } from "vitest";

import { isCustomerAccountResourcePayloadEmpty } from "../account/customerAccountResource";
import { isCheckWithdrawResponse, isWalletResourceBlocking } from "../api/walletTypes";

describe("isCheckWithdrawResponse", () => {
  it("isCheckWithdrawResponse > given withdraw/check totals with empty data array > then narrows successfully", () => {
    const payload = {
      data: [],
      netAmountTHB: 0,
      totalPayoutTHB: 0,
    };

    expect(isCheckWithdrawResponse(payload)).toBe(true);
  });
});

describe("isCustomerAccountResourcePayloadEmpty — wallet caveat", () => {
  it("isCustomerAccountResourcePayloadEmpty > given withdraw/check with data: [] > then is empty (needs wallet override)", () => {
    const payload = {
      data: [],
      netAmountTHB: 0,
      totalPayoutTHB: 0,
    };

    expect(isCustomerAccountResourcePayloadEmpty(payload)).toBe(true);
  });
});

describe("isWalletResourceBlocking", () => {
  it("isWalletResourceBlocking > given empty conversion list > then does not block the wallet page", () => {
    expect(isWalletResourceBlocking("empty")).toBe(false);
    expect(isWalletResourceBlocking("ready")).toBe(false);
  });

  it("isWalletResourceBlocking > given loading or error > then blocks the wallet page", () => {
    expect(isWalletResourceBlocking("loading")).toBe(true);
    expect(isWalletResourceBlocking("error")).toBe(true);
    expect(isWalletResourceBlocking("offline")).toBe(true);
    expect(isWalletResourceBlocking("disabled")).toBe(true);
  });
});
