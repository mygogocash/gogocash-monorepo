import { describe, expect, it } from "vitest";
import {
  nextCouponApplyGeneration,
  shouldAcceptCouponPreview,
} from "@mobile/withdraw/couponApplyGeneration";

describe("couponApplyGeneration", () => {
  it("shouldAcceptCouponPreview > given amount changed after apply started > then rejects stale preview", () => {
    const started = 1;
    const afterAmountEdit = nextCouponApplyGeneration(started);
    expect(shouldAcceptCouponPreview(started, afterAmountEdit)).toBe(false);
  });

  it("shouldAcceptCouponPreview > given generation unchanged > then accepts preview", () => {
    const started = nextCouponApplyGeneration(0);
    expect(shouldAcceptCouponPreview(started, started)).toBe(true);
  });
});
