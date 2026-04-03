import type { Offer } from "@/types/api";

/** Fixed instants so SSR and client bundles render identical mock rows (avoids hydration mismatches). */
const MOCK_NOW = new Date("2026-03-15T12:00:00.000Z");
const MOCK_YESTERDAY = new Date("2026-03-14T12:00:00.000Z");

const MOCK_PENDING_SESSION_KEY = "gogocash-admin-mock-pending-offers-v5";

export type PendingOfferRow = Offer & { submitted_at: string };

/**
 * Mock “submitted for approval” offers — same shape as `Offer` for parity with Offers Management.
 * Replace with GET /admin/offers/pending when wiring a real backend.
 */
export function getDefaultMockPendingOffers(): PendingOfferRow[] {
  return [
    {
      _id: "pending_o1",
      offer_id: 9001,
      __v: 0,
      categories: "Electronics",
      commission_tracking: "CPS",
      commissions: ["4%", "2%"],
      countries: "TH",
      currency: "THB",
      datetime_created: MOCK_YESTERDAY,
      datetime_updated: MOCK_NOW,
      description:
        "Merchant-submitted draft: cashback on gadgets and IT retail (Banana IT TH). Verify tracking link before go-live.",
      directory_page: "https://www.banana.co.th",
      is_require_approval: 1,
      logo: "/images/merchant-logos/gadgethub-th.png",
      lookup_value: "pending_banana_it_th",
      marketplace_store_offer: true,
      merchant_id: 9101,
      offer_name: "Banana IT (TH) — pending review",
      payment_terms: 45,
      preview_url: "https://www.banana.co.th",
      special_commissions: [],
      tracking_link: "https://track.example.com/pending/banana-it-th",
      tracking_type: "pending_review",
      validation_terms: 30,
      logo_desktop: "/images/merchant-logos/gadgethub-th.png",
      logo_mobile: "/images/merchant-logos/gadgethub-th-mobile.png",
      banner: "/images/merchant-logos/gadgethub-th.png",
      logo_circle: "/images/merchant-logos/gadgethub-th-mobile.png",
      disabled: false,
      offer_name_display: "Banana IT (TH)",
      commission_store: 4,
      max_cap: 10_000,
      partner_max_cap: 50_000,
      banner_mobile: "",
      extra_store: false,
      active_policy: "Standard CPS",
      affiliate_partner: "Involve Asia",
      deeplink_store_id: "banana_it_th",
      submitted_at: MOCK_YESTERDAY.toISOString(),
    },
    {
      _id: "pending_o2",
      offer_id: 9002,
      __v: 0,
      categories: "Fashion",
      commission_tracking: "CPS",
      commissions: ["5%"],
      countries: "ID",
      currency: "IDR",
      datetime_created: MOCK_NOW,
      datetime_updated: MOCK_NOW,
      description: "New brand onboarding — Adidas logo assets uploaded by partner for review.",
      directory_page: "https://www.adidas.co.id",
      is_require_approval: 1,
      logo: "/images/merchant-logos/stylemart-id.png",
      lookup_value: "pending_adidas_id",
      marketplace_store_offer: false,
      merchant_id: 9102,
      offer_name: "Adidas Indonesia — pending review",
      payment_terms: 30,
      preview_url: "https://www.adidas.co.id",
      special_commissions: [],
      tracking_link: "https://track.example.com/pending/adidas-id",
      tracking_type: "pending_review",
      validation_terms: 14,
      logo_desktop: "/images/merchant-logos/stylemart-id.png",
      logo_mobile: "/images/merchant-logos/stylemart-id-mobile.png",
      banner: "/images/merchant-logos/stylemart-id.png",
      logo_circle: "/images/merchant-logos/stylemart-id-mobile.png",
      disabled: false,
      offer_name_display: "Adidas Indonesia",
      commission_store: 5,
      max_cap: null,
      partner_max_cap: null,
      banner_mobile: "",
      extra_store: false,
      active_policy: "Fashion CPS",
      affiliate_partner: "Optimise",
      deeplink_store_id: null,
      submitted_at: MOCK_NOW.toISOString(),
    },
    {
      _id: "pending_o3",
      offer_id: 9003,
      __v: 0,
      categories: "Travel",
      commission_tracking: "CPS",
      commissions: ["6%"],
      countries: "TH,VN",
      currency: "USD",
      datetime_created: MOCK_YESTERDAY,
      datetime_updated: MOCK_NOW,
      description: "Cross-border travel offer — confirm country list and commission cap (AirAsia).",
      directory_page: "https://www.airasia.com",
      is_require_approval: 1,
      logo: "/images/merchant-logos/stayplus-travel.png",
      lookup_value: "pending_airasia_multi",
      marketplace_store_offer: false,
      merchant_id: 9103,
      offer_name: "AirAsia (Travel) — pending review",
      payment_terms: 60,
      preview_url: "https://www.airasia.com",
      special_commissions: [],
      tracking_link: "https://track.example.com/pending/airasia",
      tracking_type: "pending_review",
      validation_terms: 45,
      logo_desktop: "/images/merchant-logos/stayplus-travel.png",
      logo_mobile: "/images/merchant-logos/stayplus-travel-mobile.png",
      banner: "/images/merchant-logos/stayplus-travel.png",
      logo_circle: "/images/merchant-logos/stayplus-travel-mobile.png",
      disabled: false,
      offer_name_display: "AirAsia (Travel)",
      commission_store: 6,
      max_cap: 500,
      partner_max_cap: 2000,
      banner_mobile: "",
      extra_store: false,
      active_policy: "Travel tier A",
      affiliate_partner: "Involve Asia",
      deeplink_store_id: null,
      submitted_at: MOCK_YESTERDAY.toISOString(),
    },
  ];
}

function readPendingOffersFromSession(): PendingOfferRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MOCK_PENDING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as PendingOfferRow[];
  } catch {
    return null;
  }
}

/**
 * Current pending queue (mock): persisted in sessionStorage so approve/reject survives navigation
 * (e.g. full-page review at `/offers/pending/[id]`).
 */
export function getMockPendingOffers(): PendingOfferRow[] {
  return readPendingOffersFromSession() ?? getDefaultMockPendingOffers();
}

export function persistMockPendingOffers(rows: PendingOfferRow[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MOCK_PENDING_SESSION_KEY, JSON.stringify(rows));
}

export function clearMockPendingOffersSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MOCK_PENDING_SESSION_KEY);
}

export function resetMockPendingOffersToDefault(): PendingOfferRow[] {
  clearMockPendingOffersSession();
  return getDefaultMockPendingOffers();
}

/** Maps Offers Management country dropdown values to ISO codes in `Offer.countries`. */
export const COUNTRY_FILTER_TO_CODES: Record<string, string[]> = {
  Thailand: ["TH"],
  Indonesia: ["ID"],
  Vietnam: ["VN"],
  Philippines: ["PH"],
  India: ["IN"],
  Malaysia: ["MY"],
  Brazil: ["BR"],
  "United States of America": ["US"],
  "United Kingdom": ["GB"],
  Singapore: ["SG"],
  Myanmar: ["MM"],
};

export function offerMatchesCountryFilter(offer: Offer, filterLabel: string): boolean {
  if (!filterLabel.trim()) return true;
  const codes = COUNTRY_FILTER_TO_CODES[filterLabel];
  const raw = (offer.countries ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  if (codes?.length) {
    return codes.some((code) => raw.includes(code));
  }
  return raw.some((c) => c.toLowerCase().includes(filterLabel.toLowerCase()));
}
