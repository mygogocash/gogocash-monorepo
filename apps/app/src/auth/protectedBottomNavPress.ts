import { buildProtectedLoginRedirect } from "@mobile/auth/routeGuard";

const protectedBottomNavHrefs = new Set(["/profile", "/wallet"]);

export function isProtectedBottomNavHref(href: string): boolean {
  return protectedBottomNavHrefs.has(href);
}

/**
 * Resolve where a bottom-nav press should go when the destination requires auth.
 *
 * Native session hydrate starts with `ready: false`. Swallowing the press until
 * ready leaves Wallet/Profile dead on first tap — always navigate: either to the
 * login redirect (when we already know the user is logged out) or to the protected
 * href so the route self-guard can finish the redirect after hydrate.
 */
export function queueProtectedBottomNavWhileSessionHydrates(
  href: string,
  options: { isAuthed: boolean; ready: boolean },
): string | null {
  if (!isProtectedBottomNavHref(href)) {
    return null;
  }

  if (!options.ready) {
    return href;
  }

  if (!options.isAuthed) {
    return buildProtectedLoginRedirect(href) ?? "/login";
  }

  return href;
}
