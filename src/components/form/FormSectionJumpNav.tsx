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
      <p className="mb-1.5 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
        On this page
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => scrollTo(l.id)}
              className="text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-950/40 dark:hover:text-brand-300 cursor-pointer rounded-md px-2 py-1 text-sm font-medium underline-offset-2 transition-colors hover:underline"
            >
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
