import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { refetchPublicCatalogResources } from "@mobile/account/accountResourcePrefetch";
import { getMobileEnv } from "@mobile/config/env";

type PublicCatalogPullToRefreshOptions = {
  /** Also refetch active GET /offer search queries (search screen). */
  includeOfferSearch?: boolean;
};

export function usePublicCatalogPullToRefresh(
  options: PublicCatalogPullToRefreshOptions = {},
) {
  const queryClient = useQueryClient();
  const env = getMobileEnv();
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);
  const includeOfferSearch = options.includeOfferSearch ?? false;

  const onRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    setRefreshing(true);
    try {
      await refetchPublicCatalogResources(
        queryClient,
        env.apiUrl,
        env.accountDataSource,
      );

      if (includeOfferSearch) {
        await queryClient.refetchQueries({
          queryKey: ["offer-search"],
          type: "active",
        });
      }
    } catch (error) {
      console.warn("[usePublicCatalogPullToRefresh] refresh failed", error);
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [env.accountDataSource, env.apiUrl, includeOfferSearch, queryClient]);

  return { onRefresh, refreshing };
}
