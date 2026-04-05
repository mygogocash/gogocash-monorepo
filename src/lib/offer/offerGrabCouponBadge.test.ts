import { describe, expect, it } from "vitest";
import type { DataOffer } from "@/interfaces/offer";
import { offerHasGrabCouponBadge } from "./offerGrabCouponBadge";

function stubOffer(partial: Partial<DataOffer>): DataOffer {
  return partial as DataOffer;
}

describe("offerHasGrabCouponBadge", () => {
  it("is true when has_coupon is true", () => {
    expect(offerHasGrabCouponBadge(stubOffer({ has_coupon: true }))).toBe(true);
  });

  it("is false when has_coupon is false", () => {
    expect(offerHasGrabCouponBadge(stubOffer({ has_coupon: false }))).toBe(false);
  });

  it("uses active_coupon_count when has_coupon is unset", () => {
    expect(offerHasGrabCouponBadge(stubOffer({ active_coupon_count: 2 }))).toBe(true);
    expect(offerHasGrabCouponBadge(stubOffer({ active_coupon_count: 0 }))).toBe(false);
  });

  it("prefers explicit has_coupon over active_coupon_count", () => {
    expect(
      offerHasGrabCouponBadge(stubOffer({ has_coupon: false, active_coupon_count: 5 }))
    ).toBe(false);
  });

  it("is false when no coupon signals are present", () => {
    expect(offerHasGrabCouponBadge(stubOffer({}))).toBe(false);
  });
});
