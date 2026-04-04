/** Profile hub: personal info, withdraw methods, account (language) — used in merged account layout. */

export const profileSectionSubNavItems = [
  /** `/profile` is mobile hub only; `/profile/info` is the personal-info screen on all breakpoints. */
  { messageKey: "Personal Information", href: "/profile/info" },
  { messageKey: "sidebarWithdrawMethods", href: "/method" },
  { messageKey: "sidebarAccountSetting", href: "/language" },
] as const;

function isPersonalActive(
  pathname: string,
  isMobileProfileHub: boolean,
  viewportKnown: boolean
): boolean {
  if (pathname === "/method" || pathname.startsWith("/method/")) {
    return false;
  }
  if (pathname === "/language" || pathname.startsWith("/language/")) {
    return false;
  }
  /** Mobile `/profile` is the hub (nav list only); desktop `/profile` shows personal info. */
  if (isMobileProfileHub && pathname === "/profile") {
    return false;
  }
  /**
   * Exact `/profile` needs matchMedia; before mount, keep subnav inactive so SSR + first paint match
   * (avoids hydration mismatch and wrong highlight).
   */
  if (!viewportKnown && pathname === "/profile") {
    return false;
  }
  return pathname === "/profile" || pathname.startsWith("/profile/");
}

function isMethodActive(pathname: string): boolean {
  return pathname === "/method" || pathname.startsWith("/method/");
}

function isAccountActive(pathname: string): boolean {
  return pathname === "/language" || pathname.startsWith("/language/");
}

export function isProfileSubNavItemActive(
  pathname: string,
  href: string,
  isMobileProfileHub = false,
  viewportKnown = true
): boolean {
  if (href === "/profile/info") {
    return isPersonalActive(pathname, isMobileProfileHub, viewportKnown);
  }
  if (href === "/method") {
    return isMethodActive(pathname);
  }
  if (href === "/language") {
    return isAccountActive(pathname);
  }
  return false;
}

/** True when user is anywhere in the profile settings hub (for parent "Profile" row in panel sidebar). */
export function isProfileSectionHubActive(pathname: string): boolean {
  return (
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/method" ||
    pathname.startsWith("/method/") ||
    pathname === "/language" ||
    pathname.startsWith("/language/")
  );
}

/**
 * Keep the Profile chevron submenu open whenever the user is in the profile hub sub-routes, so
 * Personal Information / Withdraw Methods / Account Setting stay visible with the same active
 * highlight behavior as clicking between them.
 */
export function shouldAutoExpandProfileSubNav(pathname: string): boolean {
  return (
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/method" ||
    pathname.startsWith("/method/") ||
    pathname === "/language" ||
    pathname.startsWith("/language/")
  );
}
