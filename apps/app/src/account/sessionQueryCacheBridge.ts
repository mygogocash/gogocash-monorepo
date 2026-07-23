import type { QueryClient } from "@tanstack/react-query";
import { clearFirebaseIdTokenCache } from "@mobile/auth/firebaseIdTokenCache";
import { subscribeMobileSessionChange } from "@mobile/auth/session";

/**
 * Removes identity-scoped resource queries whenever the session changes.
 *
 * Auth-scoped resources include the session identity in their queryKey so a
 * different signed-in user never reads another user's cached wallet/profile
 * payload. removeQueries clears the previous identity on logout/login churn.
 */
export function createSessionQueryCacheBridge({
  queryClient,
  subscribe = subscribeMobileSessionChange,
}: {
  queryClient: QueryClient;
  subscribe?: (listener: () => void) => () => void;
}): () => void {
  return subscribe(() => {
    clearFirebaseIdTokenCache();
    queryClient.removeQueries({ queryKey: ["customer-account-resource"] });
    queryClient.removeQueries({ queryKey: ["payout-methods"] });
    queryClient.removeQueries({ queryKey: ["gototrack-settings"] });
    queryClient.removeQueries({ queryKey: ["gototrack-merchants"] });
  });
}
