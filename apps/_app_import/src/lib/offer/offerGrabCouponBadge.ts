import type { DataOffer } from "@/interfaces/offer";

/** Whether the offer card should show the “Grab Coupon” pill (API-driven). */
export function offerHasGrabCouponBadge(offer: DataOffer): boolean {
  if (offer.has_coupon === true) return true;
  if (offer.has_coupon === false) return false;
  const n = offer.active_coupon_count;
  if (typeof n === "number") return n > 0;
  return false;
}
