"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { getQueryClient } from "@/lib/query/queryClient";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CrossmintReadyProvider } from "./CrossmintReadyContext";
import { CrossmintLoginContext } from "./CrossmintLoginContext";
import CrossmintErrorBoundary from "@/components/common/CrossmintErrorBoundary";
import SettingCrossmint from "@/lib/crossmint/SettingCrossmint";
import RouteAnalyticsTracker from "@/components/analytics/RouteAnalyticsTracker";
import WebVitalsReporter from "@/components/analytics/WebVitalsReporter";
import PostHogProvider from "./PostHogProvider";
import PostHogAuthSync from "@/components/analytics/PostHogAuthSync";
import PostHogReplayController from "@/components/analytics/PostHogReplayController";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { appTheme } from "@/lib/theme";

/**
 * Static imports for Crossmint shell — `dynamic(..., { ssr: false })` here caused server/client
 * tree drift (Suspense vs Emotion styles) and hydration mismatches after removing ClientOnly.
 * SDK code stays client-only via `"use client"` on those modules.
 */

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
          <PostHogProvider>
            <CrossmintReadyProvider>
              <CrossmintErrorBoundary>
                <SettingCrossmint>
                  <CrossmintLoginContext>
                    <WebVitalsReporter />
                    <PostHogAuthSync />
                    <PostHogReplayController />
                    <Suspense fallback={null}>
                      <RouteAnalyticsTracker />
                    </Suspense>
                    {children}
                    <Toaster
                      containerStyle={{
                        bottom:
                          "calc(var(--gc-mobile-nav-clearance, 0px) + var(--gc-safe-bottom, 0px) + 8px)",
                      }}
                    />
                  </CrossmintLoginContext>
                </SettingCrossmint>
              </CrossmintErrorBoundary>
            </CrossmintReadyProvider>
          </PostHogProvider>
        </SessionProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtoolsLazy initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
};

export default ProviderDefault;
