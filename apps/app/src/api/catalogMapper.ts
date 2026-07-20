import type { OfferListResponse, OfferRecord } from "@mobile/api/catalogTypes";
import { getMobileEnv } from "@mobile/config/env";
import { resolvePublicOfferLogo } from "@mobile/api/offerLogo";
import { resolveOfferMediaUrl } from "@mobile/api/mediaUrl";
import { BRAND_LOGO_IMAGE_WIDTH } from "@mobile/api/optimizedImageUrl";
import { resolveOfferDisplayCategory } from "@mobile/api/offerDisplayCategory";

// View-model the brand cards consume — the same field shape as the
// webFavoriteBrandsPage.recentBrands fixture rows, plus the live-only extras
// (logo URL + derived tint) the upgraded card art can use.
export type CatalogBrand = {
  id: string;
  name: string;
  category: string;
  cashback: string;
  href: string;
  showGrabCoupon: boolean;
  logo?: string;
  tint: string;
  countries?: string;
  isGlobal?: boolean;
};

// The fixture cards' brand-tint language, reused so live brands get the same
// palette; the name hash keeps each brand's color stable across renders.
const CATALOG_TINT_PALETTE = [
  "#1D4ED8",
  "#0F766E",
  "#7C3AED",
  "#C2410C",
  "#2E7D5B",
  "#BE185D",
] as const;

export function deriveCatalogTint(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return CATALOG_TINT_PALETTE[hash % CATALOG_TINT_PALETTE.length];
}

function formatPercentValue(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `${raw}%`;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
  }
  return null;
}

/** Highest user-facing cashback % among product-type rows (skips taglines / cash). */
function highestProductTypeCashback(
  productType: OfferRecord["product_type"],
): string | null {
  if (!Array.isArray(productType)) return null;
  let max: number | null = null;
  for (const row of productType) {
    if (!row || typeof row !== "object") continue;
    if (row.is_tagline === true) continue;
    if (row.pay_in === "cash") continue;
    const info = row.commission_info;
    if (info == null || info === "") continue;
    const n = typeof info === "number" ? info : Number(String(info).replace(/%/g, ""));
    if (!Number.isFinite(n)) continue;
    if (max == null || n > max) max = n;
  }
  return max == null ? null : `${max}%`;
}

function formatCashback(offer: OfferRecord): string {
  const fromStore = formatPercentValue(offer.commission_store);
  if (fromStore) {
    return fromStore;
  }
  // #428 — when headline commission_store failed to persist, still surface
  // the best product-type rate instead of a misleading 0%.
  return highestProductTypeCashback(offer.product_type) ?? "0%";
}

function resolveLogo(offer: OfferRecord, apiBaseUrl?: string): string | undefined {
  const baseUrl = apiBaseUrl ?? getMobileEnv().apiUrl;
  return resolveOfferMediaUrl(resolvePublicOfferLogo(offer), baseUrl, {
    width: BRAND_LOGO_IMAGE_WIDTH,
  });
}

export function isCustomerVisibleOffer({
  disabled,
  status,
}: {
  disabled?: boolean;
  status?: string;
}): boolean {
  const normalizedStatus = status?.trim().toLowerCase();
  return (
    disabled !== true &&
    normalizedStatus !== "pending" &&
    normalizedStatus !== "pending_review" &&
    normalizedStatus !== "rejected"
  );
}

export function mapOffersToCatalogBrands(response: OfferListResponse): CatalogBrand[] {
  return response.data.flatMap((offer) => {
    if (!isCustomerVisibleOffer(offer)) {
      return [];
    }

    const name = offer.offer_name_display?.trim() || offer.offer_name?.trim() || "";
    if (!offer._id || !name) {
      return [];
    }
    return [
      {
        id: offer._id,
        name,
        category: resolveOfferDisplayCategory(offer, "Others"),
        cashback: formatCashback(offer),
        href: `/shop/${offer._id}`,
        showGrabCoupon: Boolean(offer.extra_store),
        logo: resolveLogo(offer),
        tint: deriveCatalogTint(name),
        countries: offer.countries?.trim() || undefined,
        isGlobal: offer.is_global === true,
      },
    ];
  });
}
