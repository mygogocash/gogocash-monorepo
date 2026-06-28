"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

/** Scrolls the page to a `#sectionId` element (section scroll-margin-top clears the sticky header). */
const OfferFormScrollToSectionContext = createContext<
  ((sectionId: string) => void) | null
>(null);

export function useOfferFormScrollToSection():
  | ((sectionId: string) => void)
  | null {
  return useContext(OfferFormScrollToSectionContext);
}

/**
 * Shared bordered card for offer edit (inline) and the pending-review page — a
 * content-fit card whose content flows with the page (no inner scroll), so it
 * behaves like any other detail page under the app layout.
 */
export function OfferFullscreenCardShell({
  header,
  afterHeader,
  children,
}: {
  header: ReactNode;
  /** Renders below the main header row, inside the same non-scrolling top block (e.g. in-page section nav). */
  afterHeader?: ReactNode;
  children: ReactNode;
}) {
  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Page-level scroll — the card grows with content; each section's
    // scroll-margin-top offsets the sticky AppHeader.
    el.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="flex w-full min-w-0 flex-col overflow-clip rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <OfferFormScrollToSectionContext.Provider value={scrollToSection}>
        <div className="border-b border-gray-200 bg-white px-4 pt-4 pb-4 sm:px-6 sm:pt-6 md:px-8 dark:border-gray-700 dark:bg-gray-900">
          {header}
          {afterHeader ? (
            <div className="mt-3 min-w-0">{afterHeader}</div>
          ) : null}
        </div>
        <div className="min-w-0 space-y-6 px-4 pt-4 pb-6 sm:px-6 sm:pt-5 md:px-8">
          {children}
        </div>
      </OfferFormScrollToSectionContext.Provider>
    </div>
  );
}
