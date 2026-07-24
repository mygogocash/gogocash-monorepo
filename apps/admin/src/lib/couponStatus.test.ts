import { describe, expect, it } from "vitest";
import {
  formatCouponAudienceLabel,
  formatCouponCodeLabel,
  formatCouponDiscount,
  formatCouponMaxCapLabel,
  formatCouponMinSpendLabel,
  getCouponTableStatus,
  isCouponRanOut,
} from "./couponStatus";

const REF = new Date("2026-07-22T05:00:00.000Z");

describe("couponStatus", () => {
  it("getCouponTableStatus > given disabled coupon > returns Pause", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: true,
          end_date: "2026-04-30",
          end_time: "23:59",
          quantity: 100,
          quantity_used: 100,
          start_date: "2026-04-01",
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Pause");
  });

  it("getCouponTableStatus > given future start > returns Pause until available", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          end_date: "2026-08-31",
          end_time: "23:59",
          quantity: 0,
          quantity_used: 0,
          start_date: "2026-07-23",
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Pause");
  });

  it("getCouponTableStatus > given start time later today > returns Pause until available", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          end_date: "2026-07-31",
          end_time: "23:59",
          quantity: 0,
          quantity_used: 0,
          start_date: "2026-07-22",
          start_time: "12:01",
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Pause");
  });

  it("getCouponTableStatus > given enabled coupon within its valid period > returns Active", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-07-01",
          start_time: "00:00",
          end_date: "2026-07-31",
          end_time: "23:59",
          quantity: 0,
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Active");
  });

  it("isCouponRanOut > given limited coupon fully used > returns true", () => {
    expect(
      isCouponRanOut({
        quantity: 100,
        quantity_used: 100,
        unlimited_amount_enabled: false,
      }),
    ).toBe(true);
  });

  it("getCouponTableStatus > given limited coupon fully used > returns Run out before Expired", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          end_time: "23:59",
          quantity: 100,
          quantity_used: 100,
          unlimited_amount_enabled: false,
        },
        REF,
      ).label,
    ).toBe("Run out");
  });

  it("getCouponTableStatus > given April coupon in July > returns Expired", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-04-01",
          start_time: "00:00",
          end_date: "2026-04-30",
          end_time: "23:59",
          quantity: 100,
          quantity_used: 10,
          unlimited_amount_enabled: false,
        },
        REF,
      ).label,
    ).toBe("Expired");
  });

  it("getCouponTableStatus > given end time already passed today > returns Expired", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-07-01",
          end_date: "2026-07-22",
          end_time: "11:59",
          quantity: 0,
          quantity_used: 0,
          unlimited_amount_enabled: true,
        },
        REF,
      ).label,
    ).toBe("Expired");
  });

  it("getCouponTableStatus > given unlimited coupon > never returns Run out", () => {
    expect(
      getCouponTableStatus(
        {
          disabled: false,
          start_date: "2026-06-01",
          end_date: "2026-07-31",
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

  it("legacy money labels never infer percent, THB, or an enabled cap", () => {
    expect(
      formatCouponDiscount({
        discount: 10,
        discount_type: undefined,
        discount_currency: undefined,
      }),
    ).toBe("Discount type unknown");
    expect(
      formatCouponMinSpendLabel({
        min_spend: "500",
        min_spend_enabled: true,
        min_spend_currency: undefined,
      }),
    ).toBe("Min spend 500 (currency unknown)");
    expect(
      formatCouponMaxCapLabel({
        max_cap: "200",
        max_cap_enabled: undefined,
        max_cap_currency: undefined,
      }),
    ).toBe("Max cap unknown");
  });
});
