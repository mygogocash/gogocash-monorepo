"use client";

import { useCallback } from "react";
import { useOfferFormScrollToSection } from "@/components/offer/OfferFullscreenCardShell";

export type FormSectionJumpLink = { id: string; label: string };

/**
 * “On this page” pill nav (same pattern as offer edit). Scroll target resolution:
 * 1. `OfferFullscreenCardShell` scroll context (fullscreen offer / review modals)
 * 2. optional `scrollContainerRef` for another overflow parent
 * 3. `scrollIntoView` on the window (typical full-page forms)
 */
export function FormSectionJumpNav({
  links,
  ariaLabel = "Jump to form section",
  className = "",
  scrollContainerRef,
}: {
  links: FormSectionJumpLink[];
  ariaLabel?: string;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}) {
  const contextScrollTo = useOfferFormScrollToSection();

  const scrollTo = useCallback(
    (sectionId: string) => {
      const el = document.getElementById(sectionId);
      if (!el) return;

      if (contextScrollTo) {
        contextScrollTo(sectionId);
        return;
      }

      const region = scrollContainerRef?.current ?? null;
      if (region && region.contains(el)) {
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
        return;
      }

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [contextScrollTo, scrollContainerRef],
  );

  if (links.length === 0) return null;

  return (
    <nav className={`min-w-0 ${className}`.trim()} aria-label={ariaLabel}>
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        On this page
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => scrollTo(l.id)}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-brand-500/50 dark:hover:bg-brand-950/40 dark:hover:text-brand-100"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
