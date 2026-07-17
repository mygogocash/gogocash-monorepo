import { describe, expect, it, beforeEach } from "vitest";

import {
  consumePendingShopNowIntent,
  consumePendingShopNowIntentDetails,
  peekPendingShopNowIntent,
  resetPendingShopNowIntentForTests,
  setPendingShopNowIntent,
} from "@mobile/auth/shopNowIntent";

describe("shopNowIntent", () => {
  beforeEach(() => {
    resetPendingShopNowIntentForTests();
  });

  it("consumePendingShopNowIntent > given a matching pending shop > then returns true once", () => {
    setPendingShopNowIntent("6a49f3e6ce2e0da81d6dc375");

    expect(consumePendingShopNowIntent("6a49f3e6ce2e0da81d6dc375")).toBe(true);
    expect(consumePendingShopNowIntent("6a49f3e6ce2e0da81d6dc375")).toBe(false);
  });

  it("consumePendingShopNowIntent > given a different shop id > then returns false", () => {
    setPendingShopNowIntent("shop-a");

    expect(consumePendingShopNowIntent("shop-b")).toBe(false);
    expect(consumePendingShopNowIntent("shop-a")).toBe(true);
  });

  it("coupon intent > stores only the coupon id and consumes it once for the matching shop", () => {
    setPendingShopNowIntent("shop-a", { couponId: "coupon-339" });

    expect(peekPendingShopNowIntent("shop-a")).toEqual({
      couponId: "coupon-339",
    });
    expect(consumePendingShopNowIntentDetails("shop-a")).toEqual({
      couponId: "coupon-339",
    });
    expect(consumePendingShopNowIntentDetails("shop-a")).toBeNull();
  });

  it("coupon intent > a different shop cannot consume or replace the pending coupon", () => {
    setPendingShopNowIntent("shop-a", { couponId: "coupon-339" });

    expect(consumePendingShopNowIntentDetails("shop-b")).toBeNull();
    expect(peekPendingShopNowIntent("shop-a")).toEqual({
      couponId: "coupon-339",
    });
  });
});
