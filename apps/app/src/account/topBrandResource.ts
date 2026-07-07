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
import { resolvePublicOfferLogo } from "@mobile/api/offerLogo";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { resolveFixtureBrandCountries } from "@mobile/i18n/fixtureRegionCountries";
import { offerMatchesRegion } from "@mobile/i18n/regionCatalogFilter";
import type { RegionCode } from "@mobile/i18n/regionTypes";
import { DEFAULT_REGION } from "@mobile/i18n/regionTypes";

function normalizeTopBrandCashbackLabel(cashback: string): string {
  return cashback.trim().replace(/^up to\s+/i, "");
}

/** Raw payload from GET /offer/top-brands. */
export type TopBrandsPayload = {
  data?: {
    _id?: string;
    offer_id: number;
    brand: string;
    disabled?: boolean;
    logo?: string;
    logo_desktop?: string;
    logo_mobile?: string;
    logo_circle?: string;
    cashback: string;
    status?: string;
    countries?: string;
    is_global?: boolean;
  }[];
} | null;

/** Home top-brand card (matches webTopBrandCards). */
export type TopBrandCard = {
  brand: string;
  cashback: string;
  href?: string;
  /**
   * Stable unique id from the payload (offer `_id` / `offer_id`), used as the React key so
   * two admin offers sharing a `brand` string don't collide. Absent on the static fixtures
   * (whose brands are already unique), where the key falls back to `brand`.
   */
  id?: string;
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
export function mapBackendTopBrands(
  payload: TopBrandsPayload,
  regionCode: RegionCode = DEFAULT_REGION,
  apiBaseUrl?: string,
): TopBrandCard[] {
  const items = payload?.data ?? [];
  return items
    .filter(isCustomerVisibleOffer)
    .filter(
      (item) =>
        offerMatchesRegion(item.countries, regionCode, item.is_global === true),
    )
    .map((item, index) => ({
      brand: item.brand,
      cashback: normalizeTopBrandCashbackLabel(item.cashback),
      href: item._id ? `/shop/${item._id}` : undefined,
      id: item._id ?? String(item.offer_id),
      label: "Grab Coupon",
      logoUri:
        resolveOfferMediaUrl(resolvePublicOfferLogo(item) ?? item.logo, apiBaseUrl) ??
        "",
      showGrabCoupon: false,
      tint: TOP_BRAND_TINTS[index % TOP_BRAND_TINTS.length],
    }));
}

export function mapOfferCatalogToTopBrands(
  payload: unknown,
  regionCode: RegionCode = DEFAULT_REGION,
): TopBrandCard[] {
  if (!isOfferListResponse(payload)) {
    return [];
  }

  return mapOffersToCatalogBrands(payload)
    .filter((brand) => offerMatchesRegion(brand.countries, regionCode, brand.isGlobal))
    .map((brand, index) => ({
    brand: brand.name,
    cashback: brand.cashback,
    href: brand.href,
    id: brand.href ?? brand.name,
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
  regionCode: RegionCode = DEFAULT_REGION,
  apiBaseUrl?: string,
): TopBrandCard[] {
  if (source === "backend") {
    return mapBackendTopBrands(data as TopBrandsPayload, regionCode, apiBaseUrl);
  }
  return fallback.filter((card) =>
    offerMatchesRegion(resolveFixtureBrandCountries(card.brand), regionCode),
  );
}
