import { Platform } from "react-native";

/**
 * Staging previously served the same Railway app on both
 * `staging.gogocash.co` and `app-staging.gogocash.co`. LIFF Endpoint URL is the
 * latter, and browser storage is origin-scoped — so LINE login started on the
 * alias never lands a usable GoGoCash session on the host the user is viewing.
 */
const STAGING_WEB_HOST_ALIASES = new Set(["staging.gogocash.co"]);

export function getConfiguredFrontendOrigin(
  frontendUrl = process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ?? "",
): string | null {
  if (!frontendUrl) {
    return null;
  }

  try {
    const origin = new URL(frontendUrl).origin;
    return origin.startsWith("http") ? origin : null;
  } catch {
    return null;
  }
}

export function resolveLineLoginOrigin(currentHref: string): string {
  const configured = getConfiguredFrontendOrigin();
  if (configured) {
    return configured;
  }

  return new URL(currentHref).origin;
}

export function shouldRedirectToCanonicalWebOrigin(
  currentHref: string,
  frontendUrl = process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ?? "",
): string | null {
  const canonicalOrigin = getConfiguredFrontendOrigin(frontendUrl);
  if (!canonicalOrigin) {
    return null;
  }

  let current: URL;
  try {
    current = new URL(currentHref);
  } catch {
    return null;
  }

  if (current.origin === canonicalOrigin) {
    return null;
  }

  if (!STAGING_WEB_HOST_ALIASES.has(current.hostname)) {
    return null;
  }

  return `${canonicalOrigin}${current.pathname}${current.search}${current.hash}`;
}

/** Top-level redirect for Expo web when the user opened a known staging alias. */
export function redirectStagingWebAliasToCanonicalHost(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return false;
  }

  const target = shouldRedirectToCanonicalWebOrigin(window.location.href);
  if (!target) {
    return false;
  }

  window.location.replace(target);
  return true;
}
