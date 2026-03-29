"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import AppSidebarContent from "./AppSidebarContent";

/** Matches first paint of resolved sidebar (navQueryReady false): only plain paths active on current pathname. */
function subItemActivePathnameOnly(pathname: string, path: string): boolean {
  const qIndex = path.indexOf("?");
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
  if (pathname !== base) return false;
  if (qIndex < 0) return true;
  return false;
}

function AppSidebarFallback() {
  const pathname = usePathname();
  const isSubItemActive = useCallback(
    (path: string) => subItemActivePathnameOnly(pathname, path),
    [pathname],
  );
  return <AppSidebarContent isSubItemActive={isSubItemActive} />;
}

function AppSidebarResolved() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navQueryReady, setNavQueryReady] = useState(false);
  useEffect(() => {
    setNavQueryReady(true);
  }, []);

  const isSubItemActive = useCallback(
    (path: string) => {
      const qIndex = path.indexOf("?");
      const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
      if (pathname !== base) return false;
      if (!navQueryReady) {
        if (qIndex < 0) return true;
        return false;
      }
      if (qIndex < 0) {
        const tab = searchParams.get("tab");
        return tab === null || tab === "" || tab === "offers";
      }
      const want = new URLSearchParams(path.slice(qIndex + 1));
      for (const [key, value] of want.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [pathname, searchParams, navQueryReady],
  );

  return <AppSidebarContent isSubItemActive={isSubItemActive} />;
}

export default function AppSidebar() {
  return (
    <Suspense fallback={<AppSidebarFallback />}>
      <AppSidebarResolved />
    </Suspense>
  );
}
