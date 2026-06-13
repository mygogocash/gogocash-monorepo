"use client";

import { env } from "@/env";
import { useEffect, useState } from "react";

const ANALYTICS_ENABLED = env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
/** Verbose PostHog browser logging: dev/staging builds only, never production (avoids noisy console). */
const ANALYTICS_DEBUG =
  env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true" && process.env.NODE_ENV !== "production";

export const POSTHOG_KEY = env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";
export const POSTHOG_HOST = env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

export const POSTHOG_FLAG_KEYS = {
  onboardingRegistration: "web_onboarding_registration",
  merchantDetailCta: "web_merchant_detail_cta",
  questDiscovery: "web_quest_discovery",
  withdrawEducation: "web_withdraw_education",
  smokeTest: "ph_web_smoketest",
} as const;

export type PostHogFlagKey = (typeof POSTHOG_FLAG_KEYS)[keyof typeof POSTHOG_FLAG_KEYS];

export interface PostHogClient {
  init?: (key: string, options?: Record<string, unknown>) => void;
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  alias?: (alias: string, original?: string) => void;
  identify?: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset?: () => void;
  debug?: () => void;
  get_distinct_id?: () => string;
  get_property?: (key: string) => unknown;
  getFeatureFlagPayload?: (key: string) => unknown;
  isFeatureEnabled?: (key: string) => boolean;
  onFeatureFlags?: (callback: () => void) => void;
  startSessionRecording?: () => void;
  stopSessionRecording?: () => void;
}

declare global {
  interface Window {
    posthog?: PostHogClient;
  }
}

const REPLAY_BLOCKED_PATHS = [
  "/login",
  "/register",
  "/auth/callback",
  "/profile",
  "/wallet",
  "/withdraw",
  "/subscription",
  "/membership",
];

let posthogInitialised = false;

/** Whether the PostHog snippet has finished loading (set from `markPostHogLoaded`). */
export const isPostHogInitialised = () => posthogInitialised;

const normalizeValue = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getLocaleFromPathname = (pathname: string) => {
  const [firstSegment] = pathname.split("/").filter(Boolean);
  return firstSegment === "th" ? "th" : "en";
};

export const isPostHogEnabled = () =>
  ANALYTICS_ENABLED && Boolean(POSTHOG_KEY) && Boolean(POSTHOG_HOST);

export const getPostHogClient = () => (typeof window !== "undefined" ? window.posthog : undefined);

export const getPostHogInitScript = () => {
  if (!isPostHogEnabled()) return "";

  const debugConfig = ANALYTICS_DEBUG ? `loaded: function(client) { client.debug(); },` : "";

  return `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session identify alias group set_config reset featureFlags getFeatureFlag getFeatureFlagPayload isFeatureEnabled onFeatureFlags reloadFeatureFlags startSessionRecording stopSessionRecording get_distinct_id get_property".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${POSTHOG_KEY}', {
  api_host: '${POSTHOG_HOST}',
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  session_recording: { maskAllInputs: true },
  ${debugConfig}
});
`.trim();
};

export const markPostHogLoaded = () => {
  posthogInitialised = true;
};

export const getPostHogDistinctId = () => {
  if (typeof window === "undefined" || !isPostHogEnabled()) return undefined;

  try {
    return normalizeValue(getPostHogClient()?.get_distinct_id?.());
  } catch {
    return undefined;
  }
};

export const getPostHogAnonymousId = () => {
  if (typeof window === "undefined" || !isPostHogEnabled()) return undefined;

  try {
    return normalizeValue(getPostHogClient()?.get_property?.("$device_id"));
  } catch {
    return undefined;
  }
};

export const getAppLocale = () => {
  if (typeof window === "undefined") return "en";
  return getLocaleFromPathname(window.location.pathname || "/");
};

export const getPostHogRequestHeaders = () => {
  const headers: Record<string, string> = {
    "X-App-Locale": getAppLocale(),
  };

  const distinctId = getPostHogDistinctId();
  const anonymousId = getPostHogAnonymousId();

  if (distinctId) {
    headers["X-PostHog-Distinct-Id"] = distinctId;
  }

  if (anonymousId) {
    headers["X-PostHog-Anonymous-Id"] = anonymousId;
  }

  return headers;
};

export const shouldDisablePostHogReplay = (pathname?: string | null) => {
  const raw = pathname || "/";
  // Strip locale prefix added by next-intl (e.g. /th/login → /login)
  const stripped = raw.replace(/^\/(en|th)/, "") || "/";

  return REPLAY_BLOCKED_PATHS.some((blockedPath) => {
    return stripped === blockedPath || stripped.startsWith(`${blockedPath}/`);
  });
};

export const usePostHogFlagEnabled = (key: PostHogFlagKey, fallback = false) => {
  const [enabled, setEnabled] = useState(fallback);

  useEffect(() => {
    if (!isPostHogEnabled()) return;

    const syncFlag = () => {
      const nextValue = getPostHogClient()?.isFeatureEnabled?.(key);
      setEnabled(typeof nextValue === "boolean" ? nextValue : fallback);
    };

    syncFlag();
    getPostHogClient()?.onFeatureFlags?.(syncFlag);
  }, [key, fallback]);

  return enabled;
};

export const usePostHogFlagPayload = <T>(key: PostHogFlagKey, fallback: T) => {
  const [payload, setPayload] = useState<T>(fallback);

  useEffect(() => {
    if (!isPostHogEnabled()) return;

    const syncFlag = () => {
      const nextPayload = getPostHogClient()?.getFeatureFlagPayload?.(key);
      setPayload((nextPayload as T | null) ?? fallback);
    };

    syncFlag();
    getPostHogClient()?.onFeatureFlags?.(syncFlag);
  }, [key, fallback]);

  return payload;
};
