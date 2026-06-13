import type { QueryClient } from "@tanstack/react-query";
import { subscribeMobileSessionChange } from "@mobile/auth/session";

/**
 * Removes identity-scoped resource queries whenever the session changes.
 *
 * The resource queryKey carries no auth identity and uses retry:false +
 * staleTime, so without this bridge a login/logout boundary could serve the
 * previous user's cached data (or keep pre-login 401 errors) for up to the
 * stale window. Returns a teardown that releases the subscription.
 */
export function createSessionQueryCacheBridge({
  queryClient,
  subscribe = subscribeMobileSessionChange,
}: {
  queryClient: QueryClient;
  subscribe?: (listener: () => void) => () => void;
}): () => void {
  return subscribe(() => {
    queryClient.removeQueries({ queryKey: ["customer-account-resource"] });
  });
}
