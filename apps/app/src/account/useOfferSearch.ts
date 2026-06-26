import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse, type OfferListResponse } from "@mobile/api/catalogTypes";
import { buildOfferSearchPath } from "@mobile/account/searchResource";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { getHomeSearchMatches } from "@mobile/design/webDesignParity";

export type OfferSearchMatch = {
  brand: string;
  cashback: string;
  href?: string;
  logoBackground: string;
  logoText: string;
  logoTextColor: string;
};

function mapCatalogToSearchMatches(response: OfferListResponse) {
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

export function useOfferSearch(query: string) {
  const env = useMemo(() => getMobileEnv(), []);
  const trimmed = query.trim();
  const shouldSearch = env.accountDataSource === "backend" && trimmed.length > 0;

  const searchQuery = useQuery<OfferListResponse, Error>({
    enabled: shouldSearch,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<OfferListResponse>(buildOfferSearchPath({ limit: 20, page: 1, query: trimmed }));
    },
    queryKey: ["offer-search", trimmed, env.apiUrl],
    retry: false,
  });

  if (!shouldSearch) {
    return {
      matches: getHomeSearchMatches(query),
      status: "ready" as const,
    };
  }

  if (searchQuery.isPending) {
    return { matches: [] as OfferSearchMatch[], status: "loading" as const };
  }

  if (searchQuery.isError || !isOfferListResponse(searchQuery.data)) {
    return { matches: getHomeSearchMatches(query), status: "ready" as const };
  }

  return {
    matches: mapCatalogToSearchMatches(searchQuery.data),
    status: "ready" as const,
  };
}
