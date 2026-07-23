import { useQuery } from "@tanstack/react-query";

import { mapOffersToCatalogBrands } from "@mobile/api/catalogMapper";
import { isOfferListResponse, type OfferListResponse } from "@mobile/api/catalogTypes";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { useLocale } from "@mobile/i18n/LocaleProvider";
import { filterCatalogItemsByRegion } from "@mobile/i18n/regionCatalogFilter";
import type { BrandDirectoryStore } from "@mobile/screens/discovery/discoveryTypes";

import { mapCatalogBrandsToDirectoryStores } from "./directoryCatalogResource";
import { buildOfferSearchPath, CATEGORY_OFFER_BROWSE_LIMIT } from "./searchResource";

/**
 * #462 — All Brands / All Shops default browse must not reuse home
 * `brandCatalog` page-1 (`limit=20`). Active brands outside that page were
 * invisible until the user typed a search (`limit=80`).
 */
export function useDirectoryOfferBrowse(enabled: boolean) {
  const env = getMobileEnv();
  const { region } = useLocale();

  const browseQuery = useQuery<OfferListResponse, Error>({
    enabled,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<OfferListResponse>(
        buildOfferSearchPath({
          limit: CATEGORY_OFFER_BROWSE_LIMIT,
          page: 1,
          regionCode: region,
        }),
      );
    },
    queryKey: ["directory-offer-browse", env.apiUrl, region],
    retry: false,
  });

  if (!enabled) {
    return {
      status: "idle" as const,
      stores: null as readonly BrandDirectoryStore[] | null,
    };
  }

  if (browseQuery.isPending) {
    return {
      status: "loading" as const,
      stores: null as readonly BrandDirectoryStore[] | null,
    };
  }

  if (browseQuery.isError || !isOfferListResponse(browseQuery.data)) {
    return {
      status: "error" as const,
      stores: [] as readonly BrandDirectoryStore[],
    };
  }

  return {
    status: "ready" as const,
    stores: mapCatalogBrandsToDirectoryStores(
      filterCatalogItemsByRegion(mapOffersToCatalogBrands(browseQuery.data), region),
    ),
  };
}
