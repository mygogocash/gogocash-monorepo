"use client";

import SubProfile from "@/components/layouts/SubProfile";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";
import { usePathname } from "@/i18n/navigation";

/**
 * Routes where SubPage uses showSubMenu and embeds SubProfile `variant="panel"` inside the white card.
 * `/method` uses the split shell instead: outer `SubProfile` (flat sidebar) + `SubPage` `contentOnly`.
 */
function usesIntegratedProfileSidebar(pathname: string | null): boolean {
  if (!pathname) {
    return false;
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

export default function ProfileLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const integrated = usesIntegratedProfileSidebar(pathname);

  return (
    <div className={`${LAYOUT_CONTENT_SHELL_CLASS} flex min-h-0 flex-1 gap-10 bg-[#f6f6f6]`}>
      {!integrated ? <SubProfile /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
