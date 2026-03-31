/**
 * Single source of truth for the **integrated profile shell**:
 * outer `SubProfile` aside is hidden; `SubPage` uses `showSubMenu` with `SubProfile variant="panel"` in the white card.
 *
 * Keep in sync with `app/[locale]/(profile)/*` routes. When adding a new hub page, update this helper and tests.
 */
export function isIntegratedProfileShellPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  if (pathname === "/method" || pathname.startsWith("/method/")) {
    return true;
  }
  if (pathname === "/profile" || pathname === "/profile/info") {
    return true;
  }
  if (pathname === "/profile/offer" || pathname.startsWith("/profile/offer/")) {
    return true;
  }
  if (pathname === "/profile/verify-phone" || pathname.startsWith("/profile/verify-phone/")) {
    return true;
  }
  if (pathname === "/profile/cf-phone" || pathname.startsWith("/profile/cf-phone/")) {
    return true;
  }
  if (pathname === "/language" || pathname.startsWith("/language/")) {
    return true;
  }
  if (pathname === "/wallet") {
    return true;
  }
  if (pathname === "/favorite") {
    return true;
  }
  if (pathname === "/referral") {
    return true;
  }
  if (pathname === "/subscription") {
    return true;
  }
  if (pathname === "/withdraw" || pathname.startsWith("/withdraw/")) {
    return true;
  }
  return false;
}
