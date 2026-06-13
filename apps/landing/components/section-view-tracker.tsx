"use client";

import { useEffect } from "react";
import { logSectionView } from "@/lib/analytics-client";

/**
 * Fires a `section_viewed` event the first time each landing section scrolls into
 * view — powering a scroll-depth funnel in PostHog. Observes whichever of these
 * ids exist on the page; absent ones are skipped. Consent-gated downstream.
 */
const SECTION_IDS = [
  "home",
  "brands",
  "why-gogocash",
  "features",
  "quests",
  "how-it-works",
  "why-switch",
  "learn",
  "faq",
] as const;

export default function SectionViewTracker() {
  useEffect(() => {
    const seen = new Set<string>();
    const elements = SECTION_IDS.map((id) =>
      document.getElementById(id),
    ).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !seen.has(entry.target.id)) {
            seen.add(entry.target.id);
            logSectionView(entry.target.id);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.3 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
