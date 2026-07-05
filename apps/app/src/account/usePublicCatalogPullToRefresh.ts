import { useCallback, useState } from "react";
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

  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await refetchPublicCatalogResources(
        queryClient,
        env.apiUrl,
        env.accountDataSource,
      );

      if (options.includeOfferSearch) {
        await queryClient.refetchQueries({
          queryKey: ["offer-search"],
          type: "active",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, [
    env.accountDataSource,
    env.apiUrl,
    options.includeOfferSearch,
    queryClient,
    refreshing,
  ]);

  return { onRefresh, refreshing };
}
