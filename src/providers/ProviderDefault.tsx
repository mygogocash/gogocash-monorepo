"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { getQueryClient } from "@/lib/query/queryClient";
import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CrossmintReadyProvider } from "./CrossmintReadyContext";
import RouteAnalyticsTracker from "@/components/analytics/RouteAnalyticsTracker";
import WebVitalsReporter from "@/components/analytics/WebVitalsReporter";
import PostHogProvider from "./PostHogProvider";
import PostHogAuthSync from "@/components/analytics/PostHogAuthSync";
import PostHogReplayController from "@/components/analytics/PostHogReplayController";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "@/lib/theme";

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

// Dynamically load Crossmint components to ensure they only run on the client
const SettingCrossmint = dynamic(() => import("@/lib/crossmint/SettingCrossmint"), { ssr: false });

const CrossmintErrorBoundary = dynamic(
  () =>
    import("@/components/common/CrossmintErrorBoundary").then((mod) => ({
      default: mod.default,
    })),
  { ssr: false }
);
const CrossmintLoginContextWrapper = dynamic(
  () =>
    import("@/providers/CrossmintLoginContext").then((mod) => ({
      default: mod.CrossmintLoginContext,
    })),
  { ssr: false }
);

const ReactQueryDevtoolsLazy = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((mod) => ({
      default: mod.ReactQueryDevtools,
    })),
  { ssr: false }
);

const ProviderDefault = ({ children }: { children: React.ReactNode }) => {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <SessionProvider>
          <ClientOnly>
            <PostHogProvider>
              <CrossmintReadyProvider>
                <CrossmintErrorBoundary>
                  <SettingCrossmint>
                    <CrossmintLoginContextWrapper>
                      <WebVitalsReporter />
                      <PostHogAuthSync />
                      <PostHogReplayController />
                      <Suspense fallback={null}>
                        <RouteAnalyticsTracker />
                      </Suspense>
                      {children}
                      <Toaster />
                    </CrossmintLoginContextWrapper>
                  </SettingCrossmint>
                </CrossmintErrorBoundary>
              </CrossmintReadyProvider>
            </PostHogProvider>
          </ClientOnly>
        </SessionProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" ? (
        <ClientOnly>
          <ReactQueryDevtoolsLazy initialIsOpen={false} />
        </ClientOnly>
      ) : null}
    </QueryClientProvider>
  );
};

export default ProviderDefault;
