/**
 * Maps the public top-brands payload (GET /offer/top-brands → admin-curated,
 * order-honoring list) into the home card shape (webTopBrandCards).
 *
 * Backend supplies brand + logo + admin cashback; the cosmetic fields the UI
 * needs but the backend doesn't model (label, showGrabCoupon, tint) are filled
 * here — tint cycles a fixed palette so cards stay visually distinct. Sibling
 * of [[mobile-admin-config-wiring-template]] (homeBannerResource).
 */
import type { AccountDataSource } from "@mobile/auth/routeGuard";

/** Raw payload from GET /offer/top-brands. */
export type TopBrandsPayload = {
  data?: {
    offer_id: number;
    brand: string;
    logo: string;
    cashback: string;
  }[];
} | null;

/** Home top-brand card (matches webTopBrandCards). */
export type TopBrandCard = {
  brand: string;
  cashback: string;
  label: string;
  logoUri: string;
  showGrabCoupon: boolean;
  tint: string;
};

// Cosmetic tints cycled by position (backend has no per-brand color).
const TOP_BRAND_TINTS = ["#6366F1", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];

/**
 * Spec pinned by top-brand-resource.test.ts.
 * ponytail: stubs return [] so the spec fails on an assertion (RED), not an import error.
 */
export function mapBackendTopBrands(payload: TopBrandsPayload): TopBrandCard[] {
  const items = payload?.data ?? [];
  return items.map((item, index) => ({
    brand: item.brand,
    cashback: item.cashback,
    label: "Grab Coupon",
    logoUri: item.logo,
    showGrabCoupon: false,
    tint: TOP_BRAND_TINTS[index % TOP_BRAND_TINTS.length],
  }));
}

export function resolveTopBrands(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly TopBrandCard[],
): TopBrandCard[] {
  if (source === "backend") {
    const mapped = mapBackendTopBrands(data as TopBrandsPayload);
    if (mapped.length > 0) {
      return mapped;
    }
  }
  return [...fallback];
}
