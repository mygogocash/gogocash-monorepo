import { isOfferListResponse, type OfferListResponse } from "@mobile/api/catalogTypes";
import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { getHomeSearchMatches } from "@mobile/design/webDesignParity";

import type { OfferSearchMatch } from "./useOfferSearch";

function mapCatalogToSearchMatches(response: OfferListResponse): OfferSearchMatch[] {
  return mapOffersToCatalogBrands(response).map((brand) => ({
    brand: brand.name,
    cashback: brand.cashback,
    href: brand.href,
    id: brand.id,
    logoBackground: brand.tint,
    logoText: brand.name.slice(0, 2).toUpperCase(),
    logoTextColor: "#EAF3FB",
    logoUri: brand.logo,
  }));
}

export type OfferSearchQueryState = {
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly data: unknown;
};

export type OfferSearchResult = {
  readonly matches: readonly OfferSearchMatch[];
  readonly status: "error" | "loading" | "ready";
};

export function resolveOfferSearchResult(
  query: string,
  accountDataSource: string,
  searchQuery: OfferSearchQueryState
): OfferSearchResult {
  const trimmed = query.trim();
  const shouldSearch = accountDataSource === "backend" && trimmed.length > 0;

  if (!shouldSearch) {
    return {
      matches: getHomeSearchMatches(query),
      status: "ready",
    };
  }

  if (searchQuery.isPending) {
    return { matches: [], status: "loading" };
  }

  if (searchQuery.isError || !isOfferListResponse(searchQuery.data)) {
    return { matches: [], status: "error" };
  }

  return {
    matches: mapCatalogToSearchMatches(searchQuery.data),
    status: "ready",
  };
}
