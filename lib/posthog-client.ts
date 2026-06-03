import { type PostHog } from "posthog-js";
import {
  publicPostHogHost,
  publicPostHogKey,
  shouldLoadPostHog,
} from "@/lib/app-config";
import { isAnalyticsAllowed } from "@/lib/cookie-consent";

let client: PostHog | null = null;
let initializing = false;

/** PostHog may capture only when configured/enabled AND cookie consent is granted. */
export function posthogAllowed(): boolean {
  return shouldLoadPostHog() && isAnalyticsAllowed();
}

/**
 * Load + init posthog-js once, after consent. The SDK is dynamically imported so
 * it never enters the initial bundle and never runs before the visitor accepts.
 */
async function initPostHog(): Promise<void> {
  if (typeof window === "undefined" || client || initializing) return;
  const key = publicPostHogKey();
  if (!key) return;
  initializing = true;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host: publicPostHogHost(),
      capture_pageview: false, // SPA pageviews fired manually (App Router)
      capture_pageleave: true,
      autocapture: true,
      enable_heatmaps: true, // clickmaps for the landing page
      disable_session_recording: false, // replay on, masked (consent-gated)
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-ph-mask]",
      },
      persistence: "localStorage+cookie",
      // Share the anonymous id across gogocash.co <-> app.gogocash.co so landing
      // engagement links to the eventual app signup (#identity). UTM/referrer are
      // auto-captured by posthog-js. The app must use the same project + setting.
      cross_subdomain_cookie: true,
    });
    client = posthog;
    // Capture the page the visitor is on at init (route listener handles the rest).
    posthogCapturePageView(
      `${window.location.pathname}${window.location.search}`,
    );
  } catch {
    /* SDK failed to load — analytics simply stays off */
  } finally {
    initializing = false;
  }
}

/**
 * Reconcile PostHog with the current consent decision: init or re-enable on
 * grant, opt out + reset on revoke. Safe to call repeatedly.
 */
export async function syncPostHogConsent(): Promise<void> {
  if (posthogAllowed()) {
    if (client) client.opt_in_capturing();
    else await initPostHog();
  } else if (client) {
    client.opt_out_capturing();
    client.reset();
  }
}

/** Manual SPA pageview for App Router route changes. */
export function posthogCapturePageView(path: string): void {
  if (!client || !posthogAllowed()) return;
  try {
    client.capture("$pageview", {
      path,
      $current_url: window.location.href,
    });
  } catch {
    /* noop */
  }
}

/** Capture a custom event, gated on config + consent. Safe before init (no-op). */
export function posthogCapture(
  event: string,
  props?: Record<string, unknown>,
): void {
  if (!client || !posthogAllowed()) return;
  try {
    client.capture(event, props);
  } catch {
    /* noop */
  }
}
