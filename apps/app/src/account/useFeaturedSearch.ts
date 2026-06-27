import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { buildFeaturedSearchPath } from "@mobile/account/searchResource";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { webHomeSearchPopularPanel } from "@mobile/design/webDesignParity";
import { dedupeSearchTerms } from "@mobile/search/searchHistoryCore";

type FeaturedSearchResponse = {
  data?: Array<{ term?: string }>;
};

export function isFeaturedSearchResponse(value: unknown): value is FeaturedSearchResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { data?: unknown };
  return Array.isArray(candidate.data);
}

export function useFeaturedSearchTerms() {
  const env = useMemo(() => getMobileEnv(), []);
  const shouldFetch = env.accountDataSource === "backend";

  const featuredQuery = useQuery<FeaturedSearchResponse, Error>({
    enabled: shouldFetch,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<FeaturedSearchResponse>(buildFeaturedSearchPath());
    },
    queryKey: ["featured-search-terms", env.apiUrl],
    retry: false,
  });

  if (!shouldFetch || featuredQuery.isError || !isFeaturedSearchResponse(featuredQuery.data)) {
    return webHomeSearchPopularPanel.items.map((item) => item.brand);
  }

  const terms = dedupeSearchTerms(
    (featuredQuery.data.data ?? [])
      .map((row) => (typeof row.term === "string" ? row.term.trim() : ""))
      .filter(Boolean)
  );

  return terms.length > 0 ? terms : webHomeSearchPopularPanel.items.map((item) => item.brand);
}
