import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  prefetchAuthedAccountResources,
  prefetchPublicHomeResources,
} from "@mobile/account/accountResourcePrefetch";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";

/**
 * Starts public and authed account-resource queries as soon as the query client
 * is mounted — before route screens render — so home banners and wallet/profile
 * data are warm on first paint.
 */
export function AccountResourceWarmup() {
  const queryClient = useQueryClient();
  const session = useMobileSessionSnapshot();
  const env = getMobileEnv();

  useEffect(() => {
    if (!env.apiUrl) {
      return;
    }

    void prefetchPublicHomeResources(queryClient, env.apiUrl, env.accountDataSource);
  }, [env.accountDataSource, env.apiUrl, queryClient]);

  useEffect(() => {
    if (!env.apiUrl || !session?.access_token) {
      return;
    }

    void prefetchAuthedAccountResources(queryClient, env.apiUrl, env.accountDataSource, session);
  }, [env.accountDataSource, env.apiUrl, queryClient, session?.access_token, session?._id]);

  return null;
}
