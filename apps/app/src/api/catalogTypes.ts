// Backend DTOs for the public offer catalog (GET /offer on the GoGoCash API).
// Shape verified against the live production response (2026-06): NestJS envelope
// { page, limit, total, totalPages, data: OfferRecord[] }. Only the fields the
// mobile app consumes are typed; the backend sends many more (banner, commissions,
// tracking_link, …) which pass through untyped.
export type OfferRecord = {
  _id: string;
  offer_id?: number;
  /** Marketing display name ("Klook Travel"); offer_name is the raw network name. */
  offer_name_display?: string;
  offer_name?: string;
  /** Single category label, e.g. "Travel". */
  categories?: string;
  /** Headline cashback percentage as a number, e.g. 3.5. */
  commission_store?: number | string;
  /** Absolute logo URL when the merchant has one. */
  logo?: string;
  logo_desktop?: string;
  logo_mobile?: string;
  logo_circle?: string;
  /** Extra-points / coupon flag — drives the "Grab Coupon" chip. */
  extra_store?: boolean;
  /** Admin hide flag. Public API already filters this, mapper defends in case stale data leaks. */
  disabled?: boolean;
  /** Admin curation state. Public API already filters pending/rejected rows. */
  status?: string;
  /** Comma-separated ISO or country labels, e.g. "TH" or "TH,VN". */
  countries?: string;
  /** When true, offer is visible in every selected region. */
  is_global?: boolean;
};

export type OfferListResponse = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: OfferRecord[];
};

/** Narrow an unknown backend payload to the offer-list envelope. */
export function isOfferListResponse(payload: unknown): payload is OfferListResponse {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const candidate = payload as { data?: unknown };
  return Array.isArray(candidate.data);
}
