"use client";

import type { ReactNode } from "react";
import { openCookiePreferences } from "@/lib/cookie-consent";

/**
 * Footer "Cookie Settings" affordance (#7) — re-opens the consent banner so a
 * visitor can change a prior accept/reject decision.
 */
export function CookieSettingsButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={className}
    >
      {children}
    </button>
  );
}
