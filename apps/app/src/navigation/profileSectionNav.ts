/**
 * Profile/account section navigation helpers — the Expo port of the web's
 * `src/lib/navigation/profileIntegratedShell.ts` + `src/components/layouts/profileSectionSubNav.ts`.
 *
 * These drive the desktop profile sidebar (`DesktopProfileRail`): which routes
 * render it, and which menu item / accordion sub-item is highlighted as active.
 * Pure functions so they can be unit-tested and reused by the shell + the rail.
 */

type ProfileMenuItemLike = {
  href: string;
  activePrefix?: string;
  external?: boolean;
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Authenticated profile-section routes that should render the desktop sidebar.
 * Mirrors the web `isIntegratedProfileShellPath` set — note it deliberately
 * EXCLUDES the public `/privacy-policy` page and external links (those are
 * destinations in the menu, not members of the section).
 */
const PROFILE_SECTION_PREFIXES = [
  "/profile",
  "/referral",
  "/wallet",
  "/gototrack",
  "/withdraw",
  "/method",
  "/membership",
  "/missing-orders",
  "/favorite",
  "/quest/history",
  "/age-verification",
  "/privacy-center",
  "/credit-score",
  "/language",
  "/subscription",
  "/pricing",
  "/billing",
] as const;

export function isProfileSectionPath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return PROFILE_SECTION_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

/**
 * True anywhere inside the profile settings hub — used to keep the parent
 * "Profile" row highlighted (and its accordion open) across its sub-routes.
 */
export function isProfileSectionHubActive(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return (
    matchesPrefix(pathname, "/profile") ||
    matchesPrefix(pathname, "/credit-score") ||
    matchesPrefix(pathname, "/method") ||
    matchesPrefix(pathname, "/language")
  );
}

/**
 * Active state for a single Profile-accordion sub-item. "Personal Information"
 * (`/profile/info`) covers the profile hub EXCEPT the routes that have their own
 * sub-item (My Rating Score / Withdraw Methods / Account Setting).
 */
export function isProfileSubNavItemActive(pathname: string, href: string): boolean {
  if (href === "/profile/info") {
    if (
      matchesPrefix(pathname, "/method") ||
      matchesPrefix(pathname, "/language") ||
      matchesPrefix(pathname, "/credit-score")
    ) {
      return false;
    }

    return matchesPrefix(pathname, "/profile");
  }

  if (href === "/credit-score") {
    return matchesPrefix(pathname, "/credit-score");
  }

  if (href === "/method") {
    return matchesPrefix(pathname, "/method");
  }

  if (href === "/language") {
    return matchesPrefix(pathname, "/language");
  }

  return false;
}

/** Keep the Profile accordion expanded whenever the user is inside the hub. */
export function shouldAutoExpandProfileSubNav(pathname: string | null | undefined): boolean {
  return isProfileSectionHubActive(pathname);
}

/** True anywhere inside GoGoTrack — keeps the accordion open and parent row highlighted. */
export function isGoGoTrackSectionHubActive(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return matchesPrefix(pathname, "/gototrack");
}

/** Active state for a GoGoTrack accordion sub-item. Overview matches only the hub route. */
export function isGoGoTrackSubNavItemActive(pathname: string, href: string): boolean {
  if (href === "/gototrack") {
    return pathname === "/gototrack" || pathname === "/gototrack/";
  }

  return matchesPrefix(pathname, href);
}

/** Keep the GoGoTrack accordion expanded whenever the user is on a GoGoTrack route. */
export function shouldAutoExpandGoGoTrackSubNav(pathname: string | null | undefined): boolean {
  return isGoGoTrackSectionHubActive(pathname);
}

/** Active state for a top-level rail menu item (Profile row uses the hub check). */
export function isProfileMenuItemActive(
  item: ProfileMenuItemLike,
  pathname: string | null | undefined
): boolean {
  if (item.external || !pathname) {
    return false;
  }

  const prefix = item.activePrefix ?? item.href;

  if (prefix === "/profile") {
    return isProfileSectionHubActive(pathname);
  }

  return matchesPrefix(pathname, prefix);
}
