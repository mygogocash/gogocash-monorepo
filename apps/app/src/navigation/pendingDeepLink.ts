import * as ExpoLinking from "expo-linking";

/**
 * Early deep-link capture for the AppProviders bootstrap gate.
 *
 * AppProviders withholds the router `<Stack>` until fonts + the session
 * bootstrap resolve (~1-2s on a cold Android start). During that window
 * expo-router has no "url" subscriber, so a deep link DELIVERED AS AN EVENT
 * (app already launching/running) is silently dropped and the app settles on
 * Home — verified on-device 2026-07-10 (see
 * evidence/staging/apk39-device-runbook.md, "Full-suite sweep"). Cold-start
 * URLs are unaffected: expo-router consumes `getInitialURL()` itself when the
 * Stack mounts.
 *
 * This module subscribes as early as possible (module scope of AppProviders),
 * buffers the latest event URL while the navigator is unmounted, and
 * `DeepLinkReplay` — rendered in the same commit as the Stack — replays it.
 * Same queue-until-ready class as `auth/protectedBottomNavPress.ts`.
 */

let pendingUrl: string | null = null;
let navigatorReady = false;
let subscribed = false;

export function subscribeEarlyDeepLinkCapture(): void {
  if (subscribed) {
    return;
  }
  subscribed = true;
  ExpoLinking.addEventListener("url", ({ url }) => {
    if (!navigatorReady) {
      pendingUrl = url;
    }
  });
}

/** Called by DeepLinkReplay once the router Stack is mounted. */
export function markNavigatorReady(): void {
  navigatorReady = true;
}

/** Returns the buffered url (if any) and clears the buffer. */
export function consumePendingDeepLink(): string | null {
  const url = pendingUrl;
  pendingUrl = null;
  return url;
}

/**
 * Map a captured url to an expo-router path.
 * gogocash://wallet -> /wallet; https://host/wallet?x=1 -> /wallet?x=1;
 * scheme-only / unparseable -> null.
 */
export function resolveDeepLinkReplayTarget(url: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(\?[^#]*)?/i.exec(
    url.trim(),
  );
  if (!match) {
    return null;
  }
  const [, scheme, host, pathname = "", search = ""] = match;
  const isHttp = /^https?$/i.test(scheme);
  const path = (isHttp ? pathname : `/${host}${pathname}`).replace(/\/+$/, "");
  if (!path || path === "/") {
    return null;
  }
  return `${path}${search}`;
}

/** Test seam: reset module state between specs. */
export function resetPendingDeepLinkForTests(): void {
  pendingUrl = null;
  navigatorReady = false;
  subscribed = false;
}
