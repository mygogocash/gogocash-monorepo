import {
  deriveCatalogTint,
  mapOffersToCatalogBrands,
  type CatalogBrand,
} from "@mobile/api/catalogMapper";
import type { OfferListResponse } from "@mobile/api/catalogTypes";

export type SearchPanelItem = {
  brand: string;
  cashback: string;
  href: string;
  logoBackground: string;
  logoText: string;
  logoTextColor: string;
  logoUri?: string;
};

export function buildOfferSearchPath({
  limit = 20,
  page = 1,
  query = "",
}: {
  limit?: number;
  page?: number;
  query?: string;
}): string {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  });
  const trimmed = query.trim();
  if (trimmed) {
    params.set("search", trimmed);
  }
  return `/offer?${params.toString()}`;
}

export function mapCatalogBrandToSearchPanelItem(brand: CatalogBrand): SearchPanelItem {
  const monogram = brand.name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return {
    brand: brand.name,
    cashback: brand.cashback,
    href: brand.href,
    logoBackground: brand.tint || deriveCatalogTint(brand.name),
    logoText: monogram || brand.name.charAt(0).toUpperCase(),
    logoTextColor: "#EAF3FB",
    logoUri: brand.logo,
  };
}

export function mapOffersToSearchPanelItems(response: OfferListResponse): SearchPanelItem[] {
  return mapOffersToCatalogBrands(response).map(mapCatalogBrandToSearchPanelItem);
}

export function buildFeaturedSearchPath(): string {
  return "/offer/search/featured";
}
