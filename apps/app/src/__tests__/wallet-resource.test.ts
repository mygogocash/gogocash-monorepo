import { describe, expect, it } from "vitest";

import { isCustomerAccountResourcePayloadEmpty } from "../account/customerAccountResource";
import { isCheckWithdrawResponse, isWalletResourceBlocking, normalizeCheckWithdrawResponse } from "../api/walletTypes";

describe("isCheckWithdrawResponse", () => {
  it("isCheckWithdrawResponse > given withdraw/check totals with empty data array > then narrows successfully", () => {
    const payload = {
      data: [],
      netAmountTHB: 0,
      totalPayoutTHB: 0,
    };

    expect(isCheckWithdrawResponse(payload)).toBe(true);
  });

  it("normalizeCheckWithdrawResponse > given string totals from API > then coerces to numbers", () => {
    const payload = {
      data: [],
      netAmount: "12.50",
      netAmountTHB: "0.00",
      totalPayoutTHB: "0.00",
      totalPayoutUSD: "0.00",
    };

    expect(normalizeCheckWithdrawResponse(payload)).toEqual({
      netAmount: 12.5,
      netAmountTHB: 0,
      totalPayoutTHB: 0,
      totalPayoutUSD: 0,
    });
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

describe("wallet profile vs tab parity", () => {
  it("normalizeCheckWithdrawResponse > given withdraw/check with empty data but positive netAmountTHB > then accepts payload (profile hero can show balance while conversions list is empty)", () => {
    const payload = {
      data: [],
      netAmount: 3180.24,
      netAmountTHB: 3180.24,
      totalPayoutTHB: 3500,
      totalPayoutUSD: 100,
    };

    expect(isCustomerAccountResourcePayloadEmpty(payload)).toBe(true);
    expect(normalizeCheckWithdrawResponse(payload)).toEqual({
      netAmount: 3180.24,
      netAmountTHB: 3180.24,
      totalPayoutTHB: 3500,
      totalPayoutUSD: 100,
    });
    expect(isWalletResourceBlocking("ready")).toBe(false);
  });
});
