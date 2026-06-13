"use client";

import { env } from "@/env";
import { devLogInfo } from "@/lib/clientDevLog";

/**
 * Meta Pixel (Facebook Pixel) utility library.
 *
 * Provides type-safe wrappers around the `fbq()` global that Meta's base-code
 * injects.  Every public helper checks:
 *   1. Analytics is enabled (`NEXT_PUBLIC_ANALYTICS_ENABLED`)
 *   2. The `fbq` global actually exists (script loaded)
 *
 * **No PII is ever passed to any `fbq()` call.**
 */

/* ------------------------------------------------------------------ */
/*  Global type declaration                                            */
/* ------------------------------------------------------------------ */

type FbqStandard =
  | "PageView"
  | "ViewContent"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase";

/** Meta’s injected snippet; argument shape varies by call site. */
type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYTICS_ENABLED = env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
const ANALYTICS_DEBUG = env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";
export const META_PIXEL_ID = env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "207487147928890";

/** Check all preconditions before calling fbq. */
const canFire = (): boolean => {
  if (!ANALYTICS_ENABLED) return false;
  if (typeof window === "undefined") return false;
  if (typeof window.fbq !== "function") return false;
  return true;
};

const debug = (eventName: string, params?: Record<string, unknown>) => {
  if (ANALYTICS_DEBUG) {
    devLogInfo("[meta-pixel]", eventName, params ?? "");
  }
};

/** REQ-002 – fires on merchant / product pages. */
export const trackMetaViewContent = (params: {
  content_name: string;
  content_category: string;
  content_ids: string[];
  value: number;
  currency: string;
}): void => {
  if (!canFire()) return;
  window.fbq!("track", "ViewContent" as FbqStandard, params);
  debug("ViewContent", params);
};

/** REQ-003 – fires after successful registration. */
export const trackMetaCompleteRegistration = (params: { status: boolean }): void => {
  if (!canFire()) return;
  window.fbq!("track", "CompleteRegistration" as FbqStandard, params);
  debug("CompleteRegistration", params);
};

/** REQ-004 – fires when a user clicks a merchant affiliate link. */
export const trackMetaInitiateCheckout = (): void => {
  if (!canFire()) return;
  window.fbq!("track", "InitiateCheckout" as FbqStandard);
  debug("InitiateCheckout");
};

/** REQ-005 – fires when a user successfully claims cashback. */
export const trackMetaPurchase = (params: { value: number; currency: string }): void => {
  if (!canFire()) return;
  window.fbq!("track", "Purchase" as FbqStandard, params);
  debug("Purchase", params);
};

/* ------------------------------------------------------------------ */
/*  Custom events                                                      */
/* ------------------------------------------------------------------ */

/** REQ-006 – fires when a user starts a quest. */
export const trackMetaQuestStarted = (): void => {
  if (!canFire()) return;
  window.fbq!("trackCustom", "QuestStarted");
  debug("QuestStarted (custom)");
};
