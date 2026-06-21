import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { clearMobileAppSession } from "@mobile/auth/session";
import { haptics } from "@mobile/lib/haptics";
import { resetObservabilityIdentity } from "@mobile/observability/client";

/**
 * Shared logout for the mobile profile hub and the desktop profile sidebar.
 * Tears down the secure session, the React Query cache, and the observability
 * identity, then returns to `/login`. Extracted so both surfaces stay DRY.
 */
export function useMobileLogout(): { logout: () => Promise<void>; pending: boolean } {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const logout = async () => {
    setPending(true);
    try {
      // Success haptic acknowledges the destructive action before the session is
      // torn down (fire-and-forget; no-op on web).
      void haptics.success();
      await clearMobileAppSession();
      queryClient.clear();
      resetObservabilityIdentity();
      router.replace("/login" as never);
    } finally {
      // Always clear the spinner — otherwise a failed teardown leaves the
      // logout control stuck in its pending state until the surface remounts.
      setPending(false);
    }
  };

  return { logout, pending };
}
