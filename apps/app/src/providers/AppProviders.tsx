import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PostHog, PostHogProvider } from "posthog-react-native";
import { PropsWithChildren, useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { createSessionQueryCacheBridge } from "@mobile/account/sessionQueryCacheBridge";
import { RouteAnalyticsTracker } from "@mobile/analytics/RouteAnalyticsTracker";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { ToastProvider } from "@mobile/components/Toast";
import { LocaleProvider } from "@mobile/i18n/LocaleProvider";
import { getObservabilityConfig, initObservability } from "@mobile/observability/client";
import { AccountResourceWarmup } from "@mobile/providers/AccountResourceWarmup";
import { customerQueryDefaults } from "@mobile/query/queryDefaults";
import { PrivacyScreenGuard } from "@mobile/security/PrivacyScreenGuard";
import { gogoCashRuntimeFonts } from "@mobile/theme/appFonts";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";
import { useOtaUpdateOnLaunch } from "@mobile/updates/useOtaUpdateOnLaunch";

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
  useOtaUpdateOnLaunch();
  const [fontsLoaded, fontError] = useFonts(gogoCashRuntimeFonts);
  const { ready: sessionReady } = useAuthGuardSession();
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: customerQueryDefaults,
        },
      }),
    []
  );
  const posthogConfig = useMemo(() => getObservabilityConfig(), []);
  const fontsReady = fontsLoaded || Boolean(fontError);
  const appReady = fontsReady && sessionReady;

  useEffect(() => {
    initObservability();
  }, []);

  // Login/logout must not serve the previous identity's cached resource data.
  useEffect(
    () => createSessionQueryCacheBridge({ queryClient }),
    [queryClient]
  );

  const routedContent = appReady ? (
    <>
      <RouteAnalyticsTracker />
      <AccountResourceWarmup />
      <ToastProvider>{children}</ToastProvider>
    </>
  ) : (
    <CustomerRouteState
      body="Preparing your GoGoCash experience."
      title="Loading GoGoCash"
      variant="loading"
    />
  );

  const appTree = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          {appReady ? (
            <SafeAreaProvider>
              <PrivacyScreenGuard>{routedContent}</PrivacyScreenGuard>
            </SafeAreaProvider>
          ) : (
            routedContent
          )}
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
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
