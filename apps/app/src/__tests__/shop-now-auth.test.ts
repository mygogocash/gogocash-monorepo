import { describe, expect, it, beforeEach } from "vitest";

import {
  consumePendingShopNowIntent,
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
});
