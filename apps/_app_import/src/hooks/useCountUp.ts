"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates from 0 to target over durationMs (ease-out quad). Skips animation when reducedMotion is true.
 */
export function useCountUp(
  target: number,
  durationMs: number,
  enabled: boolean,
  reducedMotion: boolean
): number {
  const [value, setValue] = useState(() => (reducedMotion || !enabled ? target : 0));
  const frameRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (reducedMotion || !enabled) {
        setValue(target);
        return;
      }

      setValue(0);
      let start: number | null = null;

      const tick = (ts: number) => {
        if (cancelled) return;
        if (start === null) start = ts;
        const elapsed = ts - start;
        const p = Math.min(1, elapsed / durationMs);
        const eased = 1 - (1 - p) * (1 - p);
        setValue(Math.round(target * eased));
        if (p < 1) {
          frameRef.current = requestAnimationFrame(tick);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, enabled, reducedMotion]);

  return value;
}
