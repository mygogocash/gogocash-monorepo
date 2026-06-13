"use client";

import type { ReactNode } from "react";
import { openCookiePreferences } from "@/lib/cookie-consent";

/**
 * Footer "Cookie Settings" affordance (#7) — opens the preference centre so a
 * visitor can change optional cookie categories.
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
