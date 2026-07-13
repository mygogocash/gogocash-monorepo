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
  banner?: string;
  categories?: string;
  /** Affiliate-network ids — Shop Now needs both to mint a per-user link. */
  offer_id?: number;
  merchant_id?: number;
  commission_store?: number | string;
  commissions?: MerchantCommission[];
  custom_terms?: string;
  logo?: string;
  logo_circle?: string;
  logo_desktop?: string;
  logo_mobile?: string;
  note_to_user?: string;
  offer_name_display?: string;
  policy_category_id?: string;
  tracking_link?: string;
  /** API-derived tracking windows (GET /offer/:id attaches this; raw config stays admin-only). */
  tracking_period?: {
    tracking_days?: number;
    confirm_days?: number;
    /** 'two_step' collapses Tracking+Confirm into one step; absent = three_step (older API). */
    flow_type?: string;
    /** Per-step captions (admin-editable; API sends defaults when unset). */
    tracking_subtitle?: string;
    confirm_subtitle?: string;
  };
};

/** Narrow an unknown backend payload to a single offer doc. */
export function isMerchantOfferResponse(payload: unknown): payload is MerchantOfferResponse {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return false;
  }
  const candidate = payload as { _id?: unknown; offer_name?: unknown };
  return typeof candidate._id === "string" && typeof candidate.offer_name === "string";
}
