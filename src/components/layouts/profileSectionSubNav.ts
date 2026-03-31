/** Profile hub: personal info, withdraw methods, account (language) — used in merged account layout. */

export const profileSectionSubNavItems = [
  { messageKey: "Personal Information", href: "/profile" },
  { messageKey: "sidebarWithdrawMethods", href: "/method" },
  { messageKey: "sidebarAccountSetting", href: "/language" },
] as const;

function isPersonalActive(pathname: string): boolean {
  if (pathname === "/method" || pathname.startsWith("/method/")) {
    return false;
  }
  if (pathname === "/language" || pathname.startsWith("/language/")) {
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

export function isProfileSubNavItemActive(pathname: string, href: string): boolean {
  if (href === "/profile") {
    return isPersonalActive(pathname);
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
    pathname.startsWith("/language/") ||
    pathname === "/privacy-center" ||
    pathname.startsWith("/privacy-center/")
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
