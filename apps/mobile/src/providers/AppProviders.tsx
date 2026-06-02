import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PostHog, PostHogProvider } from "posthog-react-native";
import { PropsWithChildren, useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RouteAnalyticsTracker } from "@mobile/analytics/RouteAnalyticsTracker";
import { AuthRouteGuard } from "@mobile/auth/AuthRouteGuard";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { LocaleProvider } from "@mobile/i18n/LocaleProvider";
import { getObservabilityConfig, initObservability } from "@mobile/observability/client";
import { PrivacyScreenGuard } from "@mobile/security/PrivacyScreenGuard";
import { gogoCashRuntimeFonts } from "@mobile/theme/appFonts";

// A no-op PostHog client used when no posthogKey is configured (local/web dev).
// We mount <PostHogProvider> in BOTH cases so usePostHog() always resolves a
// client from context; otherwise posthog-react-native console.error()s
// "usePostHog was called without a PostHog client..." once per caller, which
// surfaces as a dev error overlay. The provider only calls debug() on the client
// when autocapture is disabled, so a minimal stub is sufficient — capture/
// identify/reset are present so any consumer no-ops cleanly.
const noOpPostHogClient = {
  capture: () => undefined,
  identify: () => undefined,
  reset: () => undefined,
  screen: () => undefined,
  debug: () => undefined,
  flush: () => undefined,
  optIn: () => undefined,
  optOut: () => undefined,
} as unknown as PostHog;

export function AppProviders({ children }: PropsWithChildren) {
  const [fontsLoaded, fontError] = useFonts(gogoCashRuntimeFonts);
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5,
          },
        },
      }),
    []
  );
  const posthogConfig = useMemo(() => getObservabilityConfig(), []);

  useEffect(() => {
    initObservability();
  }, []);

  if (!fontsLoaded && !fontError) {
    // LocaleProvider must wrap this branch too — CustomerRouteState renders the desktop chrome
    // (incl. the footer, which now calls useCopy/useIntl), so it needs the IntlProvider ancestry.
    return (
      <LocaleProvider>
        <CustomerRouteState
          body="Preparing your GoGoCash experience."
          title="Loading GoGoCash"
          variant="loading"
        />
      </LocaleProvider>
    );
  }

  const appTree = (
    <LocaleProvider>
      <SafeAreaProvider>
        <PrivacyScreenGuard>
          <QueryClientProvider client={queryClient}>
            <RouteAnalyticsTracker />
            <AuthRouteGuard>{children}</AuthRouteGuard>
          </QueryClientProvider>
        </PrivacyScreenGuard>
      </SafeAreaProvider>
    </LocaleProvider>
  );

  // Keyless (local/web dev): still mount the provider with a no-op client and
  // autocapture disabled so usePostHog() resolves a client (no warning overlay)
  // without creating a real PostHog instance or sending any network traffic.
  if (!posthogConfig?.posthogKey) {
    return (
      <PostHogProvider autocapture={false} client={noOpPostHogClient}>
        {appTree}
      </PostHogProvider>
    );
  }

  return (
    <PostHogProvider
      apiKey={posthogConfig.posthogKey}
      options={{ host: posthogConfig.posthogHost || undefined }}
    >
      {appTree}
    </PostHogProvider>
  );
}
