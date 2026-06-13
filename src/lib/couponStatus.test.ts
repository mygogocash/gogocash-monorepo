import { describe, expect, it } from "vitest";
import {
  formatCouponAudienceLabel,
  formatCouponCodeLabel,
  formatCouponMaxCapLabel,
  formatCouponMinSpendLabel,
  getCouponTableStatus,
  isCouponRanOut,
  isCouponScheduled,
} from "./couponStatus";

const REF = new Date("2026-06-13T12:00:00");

describe("couponStatus", () => {
  it("isCouponScheduled > given future start_date > returns true", () => {
    expect(
      isCouponScheduled({ start_date: "2026-06-20T00:00:00.000Z" }, REF),
    ).toBe(true);
  });

  it("isCouponScheduled > given past start_date > returns false", () => {
    expect(
      isCouponScheduled({ start_date: "2026-06-06T00:00:00.000Z" }, REF),
    ).toBe(false);
  });

  it("getCouponTableStatus > given disabled coupon > returns Inactive only", () => {
    expect(
      getCouponTableStatus(
        { disabled: true, start_date: "2026-06-20T00:00:00.000Z" },
        REF,
      ).label,
    ).toBe("Inactive");
  });

  it("getCouponTableStatus > given enabled future start > returns Scheduled", () => {
    expect(
      getCouponTableStatus(
        { disabled: false, start_date: "2026-06-20T00:00:00.000Z" },
        REF,
      ).label,
    ).toBe("Scheduled");
  });

  it("getCouponTableStatus > given enabled past start > returns Active", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-06-06T00:00:00.000Z",
          end_date: "2026-12-31",
          end_time: "23:59",
          quantity: 0,
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Active");
  });

  it("isCouponRanOut > given limited coupon fully used before end > returns true", () => {
    expect(
      isCouponRanOut(
        {
          start_date: "2026-06-01",
          end_date: "2026-12-31",
          end_time: "23:59",
          quantity: 100,
          quantity_used: 100,
          unlimited_amount_enabled: false,
        },
        REF,
      ),
    ).toBe(true);
  });

  it("getCouponTableStatus > given limited coupon fully used before end > returns Ran out", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-06-01",
          end_date: "2026-12-31",
          end_time: "23:59",
          quantity: 100,
          quantity_used: 100,
          unlimited_amount_enabled: false,
        },
        REF,
      ).label,
    ).toBe("Ran out");
  });

  it("getCouponTableStatus > given unlimited coupon > never returns Ran out", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-06-01",
          end_date: "2026-12-31",
          end_time: "23:59",
          quantity: 0,
          quantity_used: 999,
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Active");
  });

  it("formatCouponCodeLabel > given trimmed code > returns code", () => {
    expect(formatCouponCodeLabel({ code: "SAVE10", code_enabled: true })).toBe(
      "code",
    );
  });

  it("formatCouponCodeLabel > given empty code > returns no code", () => {
    expect(formatCouponCodeLabel({ code: "", code_enabled: false })).toBe(
      "no code",
    );
  });

  it("formatCouponAudienceLabel > given new_users > returns For new users", () => {
    expect(formatCouponAudienceLabel({ eligibility: "new_users" })).toBe(
      "For new users",
    );
  });

  it("formatCouponAudienceLabel > given all > returns For all", () => {
    expect(formatCouponAudienceLabel({ eligibility: "all" })).toBe("For all");
  });

  it("formatCouponAudienceLabel > given members > returns For all", () => {
    expect(formatCouponAudienceLabel({ eligibility: "members" })).toBe(
      "For all",
    );
  });

  it("formatCouponMinSpendLabel > given min spend > returns Min spend X THB", () => {
    expect(
      formatCouponMinSpendLabel({
        min_spend: "500",
        min_spend_enabled: true,
        min_spend_currency: "THB",
      }),
    ).toBe("Min spend 500 THB");
  });

  it("formatCouponMinSpendLabel > given no min spend > returns No min spend", () => {
    expect(
      formatCouponMinSpendLabel({
        min_spend: "",
        min_spend_enabled: false,
        min_spend_currency: "THB",
      }),
    ).toBe("No min spend");
  });

  it("formatCouponMaxCapLabel > given max cap > returns Max cap X THB", () => {
    expect(
      formatCouponMaxCapLabel({
        max_cap: "200",
        max_cap_enabled: true,
        max_cap_currency: "THB",
      }),
    ).toBe("Max cap 200 THB");
  });

  it("formatCouponMaxCapLabel > given no max cap > returns No max cap", () => {
    expect(
      formatCouponMaxCapLabel({
        max_cap: "",
        max_cap_enabled: false,
        max_cap_currency: "THB",
      }),
    ).toBe("No max cap");
  });
});
