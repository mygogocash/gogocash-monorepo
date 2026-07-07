import { isOfferListResponse } from "@mobile/api/catalogTypes";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { filterCatalogItemsByRegion, offerMatchesRegion } from "@mobile/i18n/regionCatalogFilter";
import { resolveFixtureBrandCountries } from "@mobile/i18n/fixtureRegionCountries";
import type { RegionCode } from "@mobile/i18n/regionTypes";
import { getHomeSearchMatches } from "@mobile/design/webDesignParity";

import type { OfferSearchMatch } from "./useOfferSearch";

export type OfferSearchQueryState = {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly data: unknown;
};

export type OfferSearchResult = {
  readonly matches: readonly OfferSearchMatch[];
  readonly status: "error" | "loading" | "ready";
};

function filterFixtureSearchMatches(query: string, regionCode: RegionCode): OfferSearchMatch[] {
  return getHomeSearchMatches(query)
    .filter((item) =>
      offerMatchesRegion(resolveFixtureBrandCountries(item.brand), regionCode),
    )
    .map((item) => ({
      brand: item.brand,
      cashback: item.cashback,
      logoBackground: item.logoBackground,
      logoText: item.logoText,
      logoTextColor: item.logoTextColor,
    }));
}

export function resolveOfferSearchResult(
  query: string,
  accountDataSource: string,
  searchQuery: OfferSearchQueryState,
  regionCode: RegionCode = "TH",
): OfferSearchResult {
  const trimmed = query.trim();
  const shouldSearch = accountDataSource === "backend" && trimmed.length > 0;

  if (!shouldSearch) {
    return {
      matches: filterFixtureSearchMatches(query, regionCode),
      status: "ready",
    };
  }

  if (searchQuery.isPending) {
    return { matches: [], status: "loading" };
  }

  if (searchQuery.isError || !isOfferListResponse(searchQuery.data)) {
    return { matches: [], status: "error" };
  }

  const brands = filterCatalogItemsByRegion(
    mapOffersToCatalogBrands(searchQuery.data),
    regionCode,
  );

  return {
    matches: brands.map((brand) => ({
      brand: brand.name,
      cashback: brand.cashback,
      href: brand.href,
      id: brand.id,
      logoBackground: brand.tint,
      logoText: brand.name.slice(0, 2).toUpperCase(),
      logoTextColor: "#EAF3FB",
      logoUri: brand.logo,
    })),
    status: "ready",
  };
}
