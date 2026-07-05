import { useQuery } from "@tanstack/react-query";

import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse, type OfferListResponse } from "@mobile/api/catalogTypes";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { filterCatalogItemsByRegion } from "@mobile/i18n/regionCatalogFilter";

import { buildOfferSearchPath } from "./searchResource";
import { mapCatalogBrandsToDirectoryStores } from "./directoryCatalogResource";
import type { BrandDirectoryStore } from "@mobile/screens/discovery/discoveryTypes";

export function useDirectoryOfferSearch(query: string, enabled: boolean) {
  const env = getMobileEnv();
  const { region } = useLocale();
  const trimmed = query.trim();
  const shouldFetch = enabled && trimmed.length > 0;

  const searchQuery = useQuery<OfferListResponse, Error>({
    enabled: shouldFetch,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<OfferListResponse>(
        buildOfferSearchPath({ limit: 80, page: 1, query: trimmed, regionCode: region }),
      );
    },
    queryKey: ["directory-offer-search", trimmed, env.apiUrl, region],
    retry: false,
  });

  if (!shouldFetch) {
    return { status: "idle" as const, stores: null as readonly BrandDirectoryStore[] | null };
  }

  if (searchQuery.isPending) {
    return { status: "loading" as const, stores: null as readonly BrandDirectoryStore[] | null };
  }

  if (searchQuery.isError || !isOfferListResponse(searchQuery.data)) {
    return { status: "error" as const, stores: [] as readonly BrandDirectoryStore[] };
  }

  return {
    status: "ready" as const,
    stores: mapCatalogBrandsToDirectoryStores(
      filterCatalogItemsByRegion(mapOffersToCatalogBrands(searchQuery.data), region),
    ),
  };
}
