import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-react-native";
import { PropsWithChildren, useEffect, useMemo } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthRouteGuard } from "@mobile/auth/AuthRouteGuard";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { getObservabilityConfig, initObservability } from "@mobile/observability/client";
import { gogoCashRuntimeFonts } from "@mobile/theme/appFonts";

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
    return (
      <CustomerRouteState
        body="Preparing your GoGoCash experience."
        title="Loading GoGoCash"
        variant="loading"
      />
    );
  }

  const appTree = (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthRouteGuard>{children}</AuthRouteGuard>
      </QueryClientProvider>
    </SafeAreaProvider>
  );

  if (!posthogConfig?.posthogKey) {
    return appTree;
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
