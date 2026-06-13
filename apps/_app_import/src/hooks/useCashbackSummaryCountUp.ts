"use client";

import { useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const DURATION_MS = 1200;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export type CashbackSummaryCountUpMetrics = {
  totalCashback: number;
  pendingCashback: number;
  withdrawn: number;
};

/**
 * Animates cashback amounts from zero once when the card first enters the viewport.
 * Matches membership landing count-up easing; respects `prefers-reduced-motion`.
 */
export function useCashbackSummaryCountUp(metrics: CashbackSummaryCountUpMetrics) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const metricsRef = useRef(metrics);
  const reducedMotion = usePrefersReducedMotion();

  const [internalDone, setInternalDone] = useState(false);
  const [animatedSnap, setAnimatedSnap] = useState<CashbackSummaryCountUpMetrics>({
    totalCashback: 0,
    pendingCashback: 0,
    withdrawn: 0,
  });

  const animationSettled = reducedMotion || internalDone;
  const display = animationSettled ? metrics : animatedSnap;

  useEffect(() => {
    metricsRef.current = {
      totalCashback: metrics.totalCashback,
      pendingCashback: metrics.pendingCashback,
      withdrawn: metrics.withdrawn,
    };
  }, [metrics.totalCashback, metrics.pendingCashback, metrics.withdrawn]);

  useEffect(() => {
    if (reducedMotion || internalDone) return;

    const el = containerRef.current;
    if (!el) return;

    let observerDone = false;
    const rafRef: { id: number | null } = { id: null };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || observerDone) return;
        observerDone = true;
        obs.disconnect();

        const { totalCashback: t, pendingCashback: p, withdrawn: w } = metricsRef.current;
        const startWall = performance.now();

        const tick = (now: number) => {
          const progress = Math.min((now - startWall) / DURATION_MS, 1);
          const eased = easeOutCubic(progress);
          setAnimatedSnap({
            totalCashback: eased * t,
            pendingCashback: eased * p,
            withdrawn: eased * w,
          });
          if (progress < 1) {
            rafRef.id = requestAnimationFrame(tick);
          } else {
            rafRef.id = null;
            setInternalDone(true);
          }
        };

        rafRef.id = requestAnimationFrame(tick);
      },
      { threshold: 0.2 }
    );

    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafRef.id != null) cancelAnimationFrame(rafRef.id);
    };
  }, [reducedMotion, internalDone]);

  return { containerRef, display };
}
