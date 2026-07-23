import { describe, expect, it } from "vitest";
import { resolveWithdrawFeeAndMin } from "@mobile/withdraw/resolveWithdrawFeeAndMin";

describe("resolveWithdrawFeeAndMin", () => {
  it("resolveWithdrawFeeAndMin > given global_withdraw_fee for THB > then uses global over lane fee", () => {
    const result = resolveWithdrawFeeAndMin("backend", {
      netAmount: 1000,
      netAmountTHB: 1000,
      totalPayoutTHB: 1000,
      totalPayoutUSD: 30,
      feeAmountTHB: 20,
      fee: {
        fee_withdraw_thb: 20,
        minimum_withdraw_thb: 300,
        global_withdraw_fee: 30,
        global_minimum_withdraw: 400,
        global_withdraw_currency: "THB",
      },
    });
    expect(result).toEqual({ fee: 30, min: 400 });
  });

  it("resolveWithdrawFeeAndMin > given global currency mismatch > then uses lane THB fee", () => {
    const result = resolveWithdrawFeeAndMin("backend", {
      netAmount: 1000,
      netAmountTHB: 1000,
      totalPayoutTHB: 1000,
      totalPayoutUSD: 30,
      feeAmountTHB: 20,
      fee: {
        fee_withdraw_thb: 20,
        minimum_withdraw_thb: 300,
        global_withdraw_fee: 30,
        global_minimum_withdraw: 400,
        global_withdraw_currency: "USD",
      },
    });
    expect(result).toEqual({ fee: 20, min: 300 });
  });
});
