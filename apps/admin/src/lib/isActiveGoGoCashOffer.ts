import type { Offer } from "@/types/api";

type OfferActivityFields = Pick<Offer, "disabled" | "status">;

/** Matches customer-app visibility: not hidden and not pending/rejected review. */
export function isActiveGoGoCashOffer(
  offer: OfferActivityFields | null | undefined,
): boolean {
  if (!offer || offer.disabled === true) return false;
  const status = String(offer.status ?? "")
    .trim()
    .toLowerCase();
  return status !== "pending_review" && status !== "rejected";
}
