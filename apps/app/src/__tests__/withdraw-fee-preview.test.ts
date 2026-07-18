import { describe, expect, it } from "vitest";
import { localWithdrawFeePreview } from "@mobile/withdraw/withdrawFeePreview";

describe("localWithdrawFeePreview", () => {
  it("localWithdrawFeePreview > given amount and fee > then remaining cashback is balance minus amount", () => {
    const result = localWithdrawFeePreview({
      amount: 500,
      availableBalance: 1000,
      baseFee: 20,
      minWithdraw: 300,
    });
    expect(result).toMatchObject({
      you_will_receive: 480,
      remaining_cashback: 500,
      final_fee: 20,
    });
  });

  it("localWithdrawFeePreview > given discount > then reduces final fee", () => {
    const result = localWithdrawFeePreview({
      amount: 500,
      availableBalance: 1000,
      baseFee: 20,
      minWithdraw: 300,
      discount: 20,
    });
    expect(result).toMatchObject({
      final_fee: 0,
      you_will_receive: 500,
      remaining_cashback: 500,
    });
  });
});
