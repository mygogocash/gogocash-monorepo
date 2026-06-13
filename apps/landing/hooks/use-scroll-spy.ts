"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseScrollSpyOptions<T extends string> = {
  enabled: boolean;
  sectionIds: readonly T[];
  spyY?: number;
};

function activationLineInSection(element: HTMLElement, y: number): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top < y && rect.bottom > y;
}

function computeActiveSection<T extends string>(
  sectionIds: readonly T[],
  spyY: number,
): T {
  for (let index = sectionIds.length - 1; index >= 0; index -= 1) {
    const id = sectionIds[index];
    const element = document.getElementById(id);
    if (element && element.getBoundingClientRect().top <= spyY) {
      return id;
    }
  }
  return sectionIds[0];
}

export function useScrollSpy<T extends string>({
  enabled,
  sectionIds,
  spyY = 120,
}: UseScrollSpyOptions<T>) {
  const [activeSection, setActiveSection] = useState<T>(sectionIds[0]);
  const [scrolled, setScrolled] = useState(false);
  const lockedSectionRef = useRef<T | null>(null);

  const syncFromScroll = useCallback(() => {
    setScrolled(window.scrollY > 50);

    const lockedSection = lockedSectionRef.current;
    if (lockedSection) {
      const target = document.getElementById(lockedSection);
      if (target && activationLineInSection(target, spyY)) {
        lockedSectionRef.current = null;
      } else {
        setActiveSection(lockedSection);
        return;
      }
    }

    setActiveSection(computeActiveSection(sectionIds, spyY));
  }, [sectionIds, spyY]);

  useEffect(() => {
    if (!enabled) {
      const frame = window.requestAnimationFrame(() => {
        setScrolled(false);
        setActiveSection(sectionIds[0]);
        lockedSectionRef.current = null;
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.addEventListener("scroll", syncFromScroll, { passive: true });
    const frame = window.requestAnimationFrame(syncFromScroll);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncFromScroll);
    };
  }, [enabled, sectionIds, syncFromScroll]);

  const lockActiveSection = useCallback((sectionId: T) => {
    lockedSectionRef.current = sectionId;
    setActiveSection(sectionId);
  }, []);

  return {
    activeSection,
    scrolled,
    lockActiveSection,
  };
}
