import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { type OfferListResponse } from "@mobile/api/catalogTypes";
import { buildOfferSearchPath } from "@mobile/account/searchResource";
import { resolveOfferSearchResult } from "@mobile/account/resolveOfferSearchResult";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { getMobileEnv } from "@mobile/config/env";
import { useLocale } from "@mobile/i18n/LocaleProvider";

export type OfferSearchMatch = {
  readonly brand: string;
  readonly cashback: string;
  readonly href?: string;
  readonly id?: string;
  readonly logoBackground: string;
  readonly logoText: string;
  readonly logoTextColor: string;
  readonly logoUri?: string;
};

export function useOfferSearch(query: string) {
  const env = useMemo(() => getMobileEnv(), []);
  const { region } = useLocale();
  const trimmed = query.trim();
  const shouldSearch = env.accountDataSource === "backend" && trimmed.length > 0;

  const searchQuery = useQuery<OfferListResponse, Error>({
    enabled: shouldSearch,
    queryFn: async () => {
      const client = await getSharedMobileApiClient(env.apiUrl);
      if (!client) {
        throw new Error("No mobile session store is available.");
      }
      return client.get<OfferListResponse>(
        buildOfferSearchPath({ limit: 20, page: 1, query: trimmed, regionCode: region }),
      );
    },
    queryKey: ["offer-search", trimmed, env.apiUrl, region],
    retry: false,
  });

  return resolveOfferSearchResult(query, env.accountDataSource, searchQuery, region);
}
