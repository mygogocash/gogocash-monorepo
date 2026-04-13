"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 800;

/** Rounded integer counter from 0 → target. */
export function useAnimatedScore(target: number, enabled: boolean): number {
  const [animated, setAnimated] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / DURATION_MS);
      /** easeOutCubic */
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(target * eased);
      setAnimated(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, enabled]);

  return enabled ? animated : target;
}
