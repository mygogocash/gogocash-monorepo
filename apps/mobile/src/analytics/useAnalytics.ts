import { usePostHog } from "posthog-react-native";

import type { MobileAnalyticsClient } from "@mobile/analytics/events";

// Bridges posthog-react-native's usePostHog() to the client-agnostic
// MobileAnalyticsClient the event helpers (src/analytics/events.ts) accept. The
// helpers already no-op on a null client, so a screen can call
// trackX(useAnalytics(), ...) safely whether or not the PostHogProvider is mounted
// (it is skipped when no posthogKey is configured — see AppProviders).
//
// usePostHog() returns the PostHog client (capture/identify/reset), whose method
// shapes are structurally compatible with MobileAnalyticsClient.
export function useAnalytics(): MobileAnalyticsClient | null {
  const posthog = usePostHog();

  if (!posthog) {
    return null;
  }

  return posthog as unknown as MobileAnalyticsClient;
}
