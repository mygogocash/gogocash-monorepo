// Backend DTO for GET /offer/:id (public): a single offer doc. Shape verified
// against the live staging response (2026-06-12): detail docs carry neither
// offer_name_display nor commission_store; the headline rate lives in
// commissions[0].Commission as a preformatted string. Only consumed fields
// are typed.
export type MerchantCommission = {
  Commission?: string;
};

export type MerchantOfferResponse = {
  _id: string;
  offer_name: string;
  categories?: string;
  commission_store?: number | string;
  commissions?: MerchantCommission[];
  logo?: string;
  offer_name_display?: string;
};

/** Narrow an unknown backend payload to a single offer doc. */
export function isMerchantOfferResponse(payload: unknown): payload is MerchantOfferResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const candidate = payload as { _id?: unknown; offer_name?: unknown };
  return typeof candidate._id === "string" && typeof candidate.offer_name === "string";
}
