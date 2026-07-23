import { describe, expect, it } from "vitest";
import { COUPON_FORM_DEFAULTS } from "./couponForm";
import { buildCouponSubmitPayload } from "./couponSubmitPayload";

describe("buildCouponSubmitPayload", () => {
  it("given code disabled > then sends an empty code string", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        name: "ABC",
        offer_id: "offer-1",
        start_date: "2026-06-27",
        end_date: "2026-07-11",
        code_enabled: false,
        code: "",
      },
      { discount: 100, quantity: 0 },
    );

    expect(payload.code).toBe("");
    expect(payload.name).toBe("ABC");
    expect(payload.offer_id).toBe("offer-1");
    expect(payload.discount).toBe(100);
    expect(payload.id).toBeUndefined();
  });

  it("given an edit id > then includes id in the payload", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        id: "coupon-99",
        name: "Edit me",
        code_enabled: true,
        code: "SAVE10",
        offer_id: "offer-1",
        start_date: "2026-06-27",
        end_date: "2026-07-11",
      },
      { discount: 10, quantity: 5 },
    );

    expect(payload.id).toBe("coupon-99");
    expect(payload.code).toBe("SAVE10");
  });

  it("preserves the customer-facing coupon setup fields", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        name: "Member deal",
        offer_id: "offer-1",
        start_date: "2026-07-01",
        end_date: "2026-07-31",
        code_enabled: false,
        one_time_use_enabled: false,
        usage_per_user: "3",
        unlimited_amount_enabled: false,
        available_code_amount: "25",
        max_cap_enabled: true,
        max_cap: "500",
        max_cap_currency: "THB",
        min_spend_enabled: true,
        min_spend: "1000",
        min_spend_currency: "THB",
        discount_type: "cash",
        discount_currency: "THB",
        start_time: "09:30",
        end_time: "22:15",
        terms_and_conditions: "Valid for members only.",
      },
      { discount: 10, quantity: 25 },
    );

    expect(payload).toMatchObject({
      code_enabled: false,
      one_time_use_enabled: false,
      usage_per_user: 3,
      unlimited_amount_enabled: false,
      max_cap: 500,
      max_cap_enabled: true,
      max_cap_currency: "THB",
      min_spend_currency: "THB",
      discount_type: "cash",
      discount_currency: "THB",
      start_time: "09:30",
      end_time: "22:15",
      terms_and_conditions: "Valid for members only.",
    });
  });

  it("given a legacy URL on create or edit > then clears the unused link field", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        id: "coupon-legacy",
        link: "https://legacy.example/promo",
      },
      { discount: 10, quantity: 5 },
    );

    expect(payload.link).toBe("");
  });

  it("given untouched sparse legacy fields > then omits unknown money semantics", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        id: "legacy-sparse",
        discount_type: undefined,
        discount_currency: "",
        min_spend_currency: "",
        max_cap_enabled: undefined,
        max_cap_currency: "",
        terms_and_conditions: undefined,
        one_time_use_enabled: undefined,
        usage_per_user: undefined,
      },
      { discount: 10, quantity: 0 },
    );

    expect(payload).not.toHaveProperty("discount_type");
    expect(payload).not.toHaveProperty("discount_currency");
    expect(payload).not.toHaveProperty("min_spend_currency");
    expect(payload).not.toHaveProperty("max_cap_enabled");
    expect(payload).not.toHaveProperty("max_cap_currency");
    expect(payload).not.toHaveProperty("terms_and_conditions");
    expect(payload).not.toHaveProperty("one_time_use_enabled");
    expect(payload).not.toHaveProperty("usage_per_user");
  });

  it("given a new sparse form > then applies the documented one-time defaults", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        one_time_use_enabled: undefined,
        usage_per_user: undefined,
      },
      { discount: 10, quantity: 0 },
    );

    expect(payload.one_time_use_enabled).toBe(true);
    expect(payload.usage_per_user).toBe(1);
  });

  it("given a legacy usage value without a one-time flag > then round-trips the usage without inventing the flag", () => {
    const payload = buildCouponSubmitPayload(
      {
        ...COUPON_FORM_DEFAULTS,
        id: "legacy-usage-only",
        one_time_use_enabled: undefined,
        usage_per_user: "3",
      },
      { discount: 10, quantity: 0 },
    );

    expect(payload).not.toHaveProperty("one_time_use_enabled");
    expect(payload.usage_per_user).toBe(3);
  });
});
