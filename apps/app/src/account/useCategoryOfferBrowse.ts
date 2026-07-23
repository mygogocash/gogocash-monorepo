import { useQuery } from "@tanstack/react-query";

import { isOfferListResponse, type OfferListResponse } from "@mobile/api/catalogTypes";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { useLocale } from "@mobile/i18n/LocaleProvider";

import {
  buildOfferSearchPath,
  CATEGORY_OFFER_BROWSE_LIMIT,
} from "./searchResource";

/**
 * #438 — category detail browse must hit `/offer?category=…` (not home
 * `brandCatalog` page-1). Admin-assigned brands outside the first 20 global
 * offers were invisible until the user typed an exact name search.
 */
export function useCategoryOfferBrowse(category: string, enabled: boolean) {
  const env = getMobileEnv();
  const { region } = useLocale();
  const trimmedCategory = category.trim();
  const shouldFetch =
    enabled && trimmedCategory.length > 0 && trimmedCategory.toLowerCase() !== "all";

  const browseQuery = useQuery<OfferListResponse, Error>({
    enabled: shouldFetch,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<OfferListResponse>(
        buildOfferSearchPath({
          category: trimmedCategory,
          limit: CATEGORY_OFFER_BROWSE_LIMIT,
          page: 1,
          regionCode: region,
        }),
      );
    },
    queryKey: ["category-offer-browse", trimmedCategory, env.apiUrl, region],
    retry: false,
  });

  if (!shouldFetch) {
    return {
      data: null as OfferListResponse | null,
      status: "idle" as const,
    };
  }

  if (browseQuery.isPending) {
    return {
      data: null as OfferListResponse | null,
      status: "loading" as const,
    };
  }

  if (browseQuery.isError || !isOfferListResponse(browseQuery.data)) {
    return {
      data: { data: [], limit: CATEGORY_OFFER_BROWSE_LIMIT, page: 1, total: 0, totalPages: 0 },
      status: "error" as const,
    };
  }

  return {
    data: browseQuery.data,
    status: "ready" as const,
  };
}
