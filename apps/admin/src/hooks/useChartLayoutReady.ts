"use client";

import { useClientMounted } from "@/hooks/useClientMounted";
import { useEffect, useState } from "react";

/**
 * True after client mount plus two animation frames so the chart container
 * typically has a non-zero size before Recharts' ResizeObserver runs (avoids
 * dev warnings about width/height of chart).
 */
export function useChartLayoutReady(): boolean {
  const mounted = useClientMounted();
  const [layoutReady, setLayoutReady] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        if (!cancelled) setLayoutReady(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [mounted]);

  return mounted && layoutReady;
}
