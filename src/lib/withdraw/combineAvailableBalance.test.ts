import { describe, expect, it } from "vitest";
import { combineAvailableBalance } from "./combineAvailableBalance";
import type { ResponseWithdrawCheck } from "@/interfaces/withdraw";

const base = {
  totalPayoutTHB: 0,
  totalPayoutUSD: 0,
  netAmountTHB: 100,
  netAmount: 10,
  feeAmountTHB: 0,
  feeAmount: 0,
  feePercentage: 0,
  data: [],
  fee: { updatedAt: new Date() },
  payoutTotalCutFeeUSD: 0,
  payoutTotalCutFeeTHB: 0,
  availableWithdrawMCBTHB: 0,
  availableWithdrawMCBUSD: 0,
  MCBCashback: {
    totalMyCashbackTHB: 0,
    totalMyCashbackUSD: 0,
    availableUSD: 5,
    availableTHB: 50,
    fee: { updatedAt: new Date() },
    conversionIdMyCashback: [],
  },
} as unknown as ResponseWithdrawCheck;

describe("combineAvailableBalance", () => {
  it("returns 0 when check is undefined", () => {
    expect(combineAvailableBalance(undefined, true)).toBe(0);
  });

  it("sums THB components when thai", () => {
    expect(combineAvailableBalance(base, true)).toBe(150);
  });

  it("sums USD components when not thai", () => {
    expect(combineAvailableBalance(base, false)).toBe(15);
  });
});
