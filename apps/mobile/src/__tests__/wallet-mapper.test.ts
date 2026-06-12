import { describe, expect, it } from "vitest";
import { isCheckWithdrawResponse } from "../api/walletTypes";
import { mapCheckWithdrawToWalletMetrics } from "../api/walletMapper";

const fixtureMetrics = [
  { amount: "3,504.60", currency: "THB", hint: "tracking", label: "Total Cashback", primary: true },
  { amount: "633.60", currency: "THB", hint: "confirming", label: "Pending Cashback", primary: false },
  { amount: "1.00", currency: "THB", hint: "sent", label: "Withdrawn", primary: false },
] as const;

// Shape from WithdrawService.checkWithdraw (post a329c65 fresh-user fix).
const freshUserResponse = {
  MCBCashback: { availableTHB: 0, availableUSD: 0 },
  availableWithdrawMCBTHB: 0,
  availableWithdrawMCBUSD: 0,
  data: [],
  feeAmount: 1,
  feeAmountTHB: 30,
  feePercentage: 10,
  netAmount: 0,
  netAmountTHB: 0,
  totalPayoutTHB: 0,
  totalPayoutUSD: 0,
};

describe("isCheckWithdrawResponse", () => {
  it("given the live payload > then narrows", () => {
    expect(isCheckWithdrawResponse(freshUserResponse)).toBe(true);
  });

  it("given the wallet fixture, arrays, or null > then rejects", () => {
    expect(isCheckWithdrawResponse({ title: "x", metrics: [] })).toBe(false);
    expect(isCheckWithdrawResponse([])).toBe(false);
    expect(isCheckWithdrawResponse(null)).toBe(false);
  });
});

describe("mapCheckWithdrawToWalletMetrics", () => {
  it("given a fresh user (all zeros) > then every metric reads 0.00 — fixture amounts never leak", () => {
    const metrics = mapCheckWithdrawToWalletMetrics(freshUserResponse, fixtureMetrics);

    expect(metrics.map((m) => m.amount)).toEqual(["0.00", "0.00", "0.00"]);
    // Labels/hints/currency keep the fixture's design copy.
    expect(metrics[0]).toMatchObject({ currency: "THB", label: "Total Cashback", primary: true });
  });

  it("given a live balance > then the headline metric formats with thousands separators", () => {
    const metrics = mapCheckWithdrawToWalletMetrics(
      { ...freshUserResponse, netAmountTHB: 3504.6 },
      fixtureMetrics
    );

    expect(metrics[0]?.amount).toBe("3,504.60");
  });
});
