"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

/** Scrolls a `#sectionId` element inside the offer form’s overflow container (not `document`). */
export const OfferFormScrollToSectionContext = createContext<
  ((sectionId: string) => void) | null
>(null);

export function useOfferFormScrollToSection(): ((sectionId: string) => void) | null {
  return useContext(OfferFormScrollToSectionContext);
}

/**
 * Shared bordered card + min-height stack for offer edit (fullscreen modal) and
 * pending review page so layout and scroll behavior stay aligned.
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
  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const scrollToSection = useCallback((sectionId: string) => {
    const region = scrollBodyRef.current;
    const el = document.getElementById(sectionId);
    if (!region || !el || !region.contains(el)) return;

    const scrollerRect = region.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const nextTop = region.scrollTop + (elRect.top - scrollerRect.top);

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    region.scrollTo({
      top: Math.max(0, nextTop),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Top block keeps title, actions, and optional sub-nav in view; scroll is body only. Safe-area on top/bottom. */}
      <OfferFormScrollToSectionContext.Provider value={scrollToSection}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-6 sm:pt-6 md:px-8 dark:border-gray-700 dark:bg-gray-900">
            {header}
            {afterHeader ? <div className="mt-3 min-w-0">{afterHeader}</div> : null}
          </div>
          <div
            ref={scrollBodyRef}
            className="min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pr-1 pt-4 sm:px-6 sm:pb-6 sm:pt-5 md:px-8 [scrollbar-gutter:stable]"
          >
            {children}
          </div>
        </div>
      </OfferFormScrollToSectionContext.Provider>
    </div>
  );
}
