import { describe, expect, it } from "vitest";
import { isCustomerSubscriptionStatus } from "../api/billingTypes";
import { mapSubscriptionStatus } from "../api/billingMapper";

describe("isCustomerSubscriptionStatus", () => {
  it("given the backend status payload > then narrows (disabled and enabled shapes)", () => {
    expect(isCustomerSubscriptionStatus({ enabled: false, status: "disabled" })).toBe(true);
    expect(
      isCustomerSubscriptionStatus({
        currentPeriodEnd: "2026-07-12T00:00:00.000Z",
        enabled: true,
        status: "active",
      })
    ).toBe(true);
  });

  it("given page-model fixtures, arrays, or null > then rejects", () => {
    expect(isCustomerSubscriptionStatus({ title: "x", ctaLabel: "y" })).toBe(false);
    expect(isCustomerSubscriptionStatus([])).toBe(false);
    expect(isCustomerSubscriptionStatus(null)).toBe(false);
  });
});

describe("mapSubscriptionStatus", () => {
  it("given active or trialing > then isActive", () => {
    expect(mapSubscriptionStatus({ enabled: true, status: "active" }).isActive).toBe(true);
    expect(mapSubscriptionStatus({ enabled: true, status: "trialing" }).isActive).toBe(true);
  });

  it("given disabled, none, or canceled > then not active", () => {
    expect(mapSubscriptionStatus({ enabled: false, status: "disabled" }).isActive).toBe(false);
    expect(mapSubscriptionStatus({ enabled: true, status: "none" }).isActive).toBe(false);
    expect(mapSubscriptionStatus({ enabled: true, status: "canceled" }).isActive).toBe(false);
  });
});
