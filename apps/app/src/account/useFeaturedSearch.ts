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

function fixtureFeaturedTerms(): string[] {
  return webHomeSearchPopularPanel.items.map((item) => item.brand);
}

// Popular-terms chain: curated featured terms → live brand catalog (capped to
// the fixture panel size) → fixture brands. Staging's featured endpoint is
// empty today, so without the live fallback the demo fixture brands leak into
// backend-mode UI.
export function resolveFeaturedSearchTerms({
  backendTerms,
  fallbackTerms,
}: {
  backendTerms: readonly string[] | null;
  fallbackTerms?: readonly string[];
}): string[] {
  const curated = dedupeSearchTerms([...(backendTerms ?? [])]);
  if (curated.length > 0) {
    return curated;
  }

  const live = dedupeSearchTerms([...(fallbackTerms ?? [])]);
  if (live.length > 0) {
    return live.slice(0, webHomeSearchPopularPanel.items.length);
  }

  return fixtureFeaturedTerms();
}

export function useFeaturedSearchTerms(fallbackTerms?: readonly string[]) {
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
    return resolveFeaturedSearchTerms({ backendTerms: null, fallbackTerms });
  }

  const backendTerms = (featuredQuery.data.data ?? [])
    .map((row) => (typeof row.term === "string" ? row.term.trim() : ""))
    .filter(Boolean);

  return resolveFeaturedSearchTerms({ backendTerms, fallbackTerms });
}
