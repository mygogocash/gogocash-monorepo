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
});
