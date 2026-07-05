import type { OfferListResponse, OfferRecord } from "@mobile/api/catalogTypes";
import { resolvePublicOfferLogo } from "@mobile/api/offerLogo";
import { resolveRemoteImageUri } from "@mobile/api/mediaUrl";

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

function formatCashback(commission: OfferRecord["commission_store"]): string {
  const value = typeof commission === "number" ? String(commission) : commission?.trim();
  if (!value) {
    return "0%";
  }
  return value.endsWith("%") ? value : `${value}%`;
}

function resolveLogo(offer: OfferRecord): string | undefined {
  return resolveRemoteImageUri(resolvePublicOfferLogo(offer));
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
        category: offer.categories?.trim() || "Others",
        cashback: formatCashback(offer.commission_store),
        href: `/shop/${offer._id}`,
        showGrabCoupon: Boolean(offer.extra_store),
        logo: resolveLogo(offer),
        tint: deriveCatalogTint(name),
      },
    ];
  });
}
