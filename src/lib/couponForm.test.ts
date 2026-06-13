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
    expect(COUPON_FORM_DEFAULTS.discount_type).toBe("percent");
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
});
