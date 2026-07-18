import { describe, expect, it } from "vitest";
import { resolveBankPayoutAmount } from "./withdrawBankPayout";

describe("resolveBankPayoutAmount", () => {
  it("resolveBankPayoutAmount > given fee final > then subtracts from amount_net", () => {
    expect(
      resolveBankPayoutAmount({ amount_net: 500, withdraw_fee_final: 20 }),
    ).toBe(480);
  });

  it("resolveBankPayoutAmount > given waived fee > then bank payout equals amount_net", () => {
    expect(
      resolveBankPayoutAmount({ amount_net: 500, withdraw_fee_final: 0 }),
    ).toBe(500);
  });

  it("resolveBankPayoutAmount > given legacy row without fee fields > then returns amount_net", () => {
    expect(resolveBankPayoutAmount({ amount_net: 500 })).toBe(500);
  });
});
