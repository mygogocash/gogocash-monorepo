import { describe, expect, it } from "vitest";
import { COUPON_FORM_DEFAULTS, couponDataToForm } from "./couponForm";
import type { CouponData } from "@/types/coupon";

const baseCoupon: CouponData = {
  _id: "c1",
  name: "Summer Sale",
  description: "10% off",
  code: "SUMMER10",
  offer_id: {
    _id: "o1",
    offer_name: "Brand A",
    offer_name_display: "Brand A Display",
  },
  start_date: "2026-06-01T00:00:00.000Z",
  end_date: "2026-12-31",
  eligibility: "new_users",
  min_spend: "500",
  discount: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  disabled: false,
  __v: 0,
  link: "https://example.com",
};

describe("couponForm", () => {
  it("COUPON_FORM_DEFAULTS > has expected create shape", () => {
    expect(COUPON_FORM_DEFAULTS.discount_type).toBeUndefined();
    expect(COUPON_FORM_DEFAULTS.discount_currency).toBe("");
    expect(COUPON_FORM_DEFAULTS.unlimited_amount_enabled).toBe(true);
  });

  it("couponDataToForm > maps API coupon to editable form", () => {
    const form = couponDataToForm({
      ...baseCoupon,
      quantity: 100,
      quantity_used: 40,
      usage_per_user: "3",
      one_time_use_enabled: false,
    });

    expect(form.id).toBe("c1");
    expect(form.offer_id).toBe("o1");
    expect(form.start_date).toBe("2026-06-01");
    expect(form.code_enabled).toBe(true);
    expect(form.one_time_use_enabled).toBe(false);
    expect(form.usage_per_user).toBe("3");
    expect(form.unlimited_amount_enabled).toBe(false);
    expect(form.available_code_amount).toBe("100");
  });

  it("couponDataToForm > given empty offer id > leaves offer_id empty", () => {
    const form = couponDataToForm({
      ...baseCoupon,
      offer_id: { _id: "", offer_name: "Brand A" },
    });
    expect(form.offer_id).toBe("");
  });

  it("couponDataToForm > preserves unknown legacy money semantics", () => {
    const form = couponDataToForm({
      ...baseCoupon,
      discount_type: undefined,
      discount_currency: undefined,
      min_spend: "",
      min_spend_currency: undefined,
      max_cap: undefined,
      max_cap_enabled: undefined,
      max_cap_currency: undefined,
    });

    expect(form.discount_type).toBeUndefined();
    expect(form.discount_currency).toBe("");
    expect(form.min_spend_currency).toBe("");
    expect(form.max_cap_enabled).toBeUndefined();
    expect(form.max_cap_currency).toBe("");
  });

  it("couponDataToForm > preserves sparse legacy redemption semantics", () => {
    const form = couponDataToForm({
      ...baseCoupon,
      one_time_use_enabled: undefined,
      usage_per_user: undefined,
    });

    expect(form.one_time_use_enabled).toBeUndefined();
    expect(form.usage_per_user).toBe("");
  });

  it("couponDataToForm > preserves an explicit one-use value for round-trip", () => {
    const form = couponDataToForm({
      ...baseCoupon,
      one_time_use_enabled: true,
      usage_per_user: 1,
    });

    expect(form.one_time_use_enabled).toBe(true);
    expect(form.usage_per_user).toBe("1");
  });
});
