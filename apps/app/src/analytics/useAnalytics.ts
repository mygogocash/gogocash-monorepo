import { usePostHog } from "posthog-react-native";

import type { MobileAnalyticsClient } from "@mobile/analytics/events";

// Bridges posthog-react-native's usePostHog() to the client-agnostic
// MobileAnalyticsClient the event helpers (src/analytics/events.ts) accept. The
// helpers already no-op on a null client, so a screen can call
// trackX(useAnalytics(), ...) safely whether or not analytics are configured.
//
// AppProviders ALWAYS mounts <PostHogProvider> (the real client when a key is
// configured, otherwise a no-op client) so usePostHog() always resolves a client
// from context. That avoids posthog-react-native's one-time console.error
// ("usePostHog was called without a PostHog client...") which otherwise surfaces
// as a dev error overlay on every keyless (local/web) build.
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
