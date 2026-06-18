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
import { isCustomerVisibleOffer, mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import { resolveRemoteImageUri } from "@mobile/api/mediaUrl";

/** Raw payload from GET /offer/top-brands. */
export type TopBrandsPayload = {
  data?: {
    _id?: string;
    offer_id: number;
    brand: string;
    disabled?: boolean;
    logo: string;
    cashback: string;
    status?: string;
  }[];
} | null;

/** Home top-brand card (matches webTopBrandCards). */
export type TopBrandCard = {
  brand: string;
  cashback: string;
  href?: string;
  label: string;
  logoUri: string;
  showGrabCoupon: boolean;
  tint: string;
};

// Cosmetic tints cycled by position (backend has no per-brand color).
const TOP_BRAND_TINTS = ["#6366F1", "#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444"];

/**
 * Spec pinned by top-brand-resource.test.ts.
 */
export function mapBackendTopBrands(payload: TopBrandsPayload): TopBrandCard[] {
  const items = payload?.data ?? [];
  return items
    .filter(isCustomerVisibleOffer)
    .map((item, index) => ({
      brand: item.brand,
      cashback: item.cashback,
      href: item._id ? `/shop/${item._id}` : undefined,
      label: "Grab Coupon",
      logoUri: resolveRemoteImageUri(item.logo) ?? "",
      showGrabCoupon: false,
      tint: TOP_BRAND_TINTS[index % TOP_BRAND_TINTS.length],
    }));
}

export function mapOfferCatalogToTopBrands(payload: unknown): TopBrandCard[] {
  if (!isOfferListResponse(payload)) {
    return [];
  }

  return mapOffersToCatalogBrands(payload).map((brand, index) => ({
    brand: brand.name,
    cashback: brand.cashback,
    href: brand.href,
    label: "Grab Coupon",
    logoUri: brand.logo ?? "",
    showGrabCoupon: brand.showGrabCoupon,
    tint: brand.tint || TOP_BRAND_TINTS[index % TOP_BRAND_TINTS.length],
  }));
}

export function resolveTopBrands(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly TopBrandCard[],
  _catalogData?: unknown,
): TopBrandCard[] {
  if (source === "backend") {
    return mapBackendTopBrands(data as TopBrandsPayload);
  }
  return [...fallback];
}
