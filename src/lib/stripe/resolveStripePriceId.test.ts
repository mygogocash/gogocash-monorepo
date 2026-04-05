import { beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveStripePriceId", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the Price ID from env for plus monthly", async () => {
    vi.doMock("@/env", () => ({
      env: {
        STRIPE_PRICE_THB_MONTHLY: undefined,
        STRIPE_PRICE_THB_ANNUAL: undefined,
        STRIPE_PRICE_STARTER_MONTHLY: "price_st_m",
        STRIPE_PRICE_STARTER_YEARLY: "price_st_y",
        STRIPE_PRICE_PLUS_MONTHLY: "price_pl_m",
        STRIPE_PRICE_PLUS_YEARLY: "price_pl_y",
        STRIPE_PRICE_PRO_MONTHLY: "price_pr_m",
        STRIPE_PRICE_PRO_YEARLY: "price_pr_y",
      },
    }));
    const { resolveStripePriceId } = await import("./resolveStripePriceId");
    expect(resolveStripePriceId("plus", "month")).toBe("price_pl_m");
    expect(resolveStripePriceId("pro", "year")).toBe("price_pr_y");
  });

  it("returns undefined when price env is missing", async () => {
    vi.doMock("@/env", () => ({
      env: {
        STRIPE_PRICE_THB_MONTHLY: undefined,
        STRIPE_PRICE_THB_ANNUAL: undefined,
        STRIPE_PRICE_STARTER_MONTHLY: undefined,
        STRIPE_PRICE_STARTER_YEARLY: undefined,
        STRIPE_PRICE_PLUS_MONTHLY: undefined,
        STRIPE_PRICE_PLUS_YEARLY: undefined,
        STRIPE_PRICE_PRO_MONTHLY: undefined,
        STRIPE_PRICE_PRO_YEARLY: undefined,
      },
    }));
    const { resolveStripePriceId } = await import("./resolveStripePriceId");
    expect(resolveStripePriceId("starter", "month")).toBeUndefined();
  });

  it("prefers shared THB price IDs for starter and plus", async () => {
    vi.doMock("@/env", () => ({
      env: {
        STRIPE_PRICE_THB_MONTHLY: "price_thb_m",
        STRIPE_PRICE_THB_ANNUAL: "price_thb_y",
        STRIPE_PRICE_STARTER_MONTHLY: "price_st_m",
        STRIPE_PRICE_STARTER_YEARLY: "price_st_y",
        STRIPE_PRICE_PLUS_MONTHLY: "price_pl_m",
        STRIPE_PRICE_PLUS_YEARLY: "price_pl_y",
        STRIPE_PRICE_PRO_MONTHLY: "price_pr_m",
        STRIPE_PRICE_PRO_YEARLY: "price_pr_y",
      },
    }));
    const { resolveStripePriceId } = await import("./resolveStripePriceId");
    expect(resolveStripePriceId("starter", "month")).toBe("price_thb_m");
    expect(resolveStripePriceId("plus", "year")).toBe("price_thb_y");
    expect(resolveStripePriceId("pro", "month")).toBe("price_pr_m");
  });
});
