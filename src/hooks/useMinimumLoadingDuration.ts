import { useEffect, useRef, useState } from "react";

/** Minimum time full-page loaders stay visible (ms). */
export const MIN_PAGE_LOADING_MS = 3000;

/**
 * Keeps UI visible for at least `minMs` after `loading` first becomes true,
 * even if `loading` flips false sooner.
 */
export function useMinimumLoadingDuration(loading: boolean, minMs = MIN_PAGE_LOADING_MS) {
  const [visible, setVisible] = useState(loading);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) {
      startedAtRef.current = Date.now();
      queueMicrotask(() => setVisible(true));
      return;
    }

    const startedAt = startedAtRef.current;
    if (startedAt === null) {
      queueMicrotask(() => setVisible(false));
      return;
    }

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, minMs - elapsed);
    const id = window.setTimeout(() => {
      setVisible(false);
      startedAtRef.current = null;
    }, remaining);

    return () => clearTimeout(id);
  }, [loading, minMs]);

  return visible;
}
