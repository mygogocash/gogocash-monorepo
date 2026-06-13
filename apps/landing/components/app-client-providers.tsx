"use client";

import type { ReactNode } from "react";
import { BrowserLocaleBootstrap } from "@/components/browser-locale-bootstrap";
import { FirebaseClientInit } from "@/components/firebase-client-init";
import { PostHogInit } from "@/components/posthog-init";
import { AnalyticsRouteListener } from "@/components/analytics-route-listener";
import CookieConsent from "@/components/cookie-consent";
import PageTransition from "@/components/page-transition";
import LoadingScreen from "@/components/loading-screen";

/**
 * Client-only providers and shell (analytics, locale, loading).
 * LINE Tag stays in `app/layout.tsx` (noscript + script ordering).
 */
export function AppClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <BrowserLocaleBootstrap />
      <FirebaseClientInit />
      <PostHogInit />
      <AnalyticsRouteListener />
      <LoadingScreen>
        <PageTransition>{children}</PageTransition>
      </LoadingScreen>
      <CookieConsent />
    </>
  );
}
