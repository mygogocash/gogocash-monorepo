"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MIN_PAGE_LOADING_MS } from "@/hooks/useMinimumLoadingDuration";

const PageLoader = dynamic(() => import("@/components/common/PageLoader"), { ssr: false });

type NavigationLoadingContextValue = {
  beginNavigationLoading: () => void;
  endNavigationLoading: () => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const [show, setShow] = useState(false);
  const depthRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const beginNavigationLoading = useCallback(() => {
    clearHideTimeout();
    depthRef.current += 1;
    if (depthRef.current === 1) {
      startRef.current = Date.now();
      setShow(true);
    }
  }, [clearHideTimeout]);

  const endNavigationLoading = useCallback(() => {
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current > 0) return;

    const start = startRef.current;
    startRef.current = null;
    if (start === null) return;

    const minEnd = start + MIN_PAGE_LOADING_MS;
    const hideAt = Math.max(minEnd, Date.now());
    const delay = Math.max(0, hideAt - Date.now());
    hideTimeoutRef.current = setTimeout(() => {
      setShow(false);
      hideTimeoutRef.current = null;
    }, delay);
  }, []);

  useEffect(() => () => clearHideTimeout(), [clearHideTimeout]);

  const contextValue = useMemo(
    () => ({ beginNavigationLoading, endNavigationLoading }),
    [beginNavigationLoading, endNavigationLoading]
  );

  return (
    <NavigationLoadingContext.Provider value={contextValue}>
      {children}
      {show ? (
        <div className="fixed inset-0 z-200 flex min-h-dvh w-full items-center justify-center bg-(--gc-surface,#ffffff)">
          <p className="sr-only" role="status">
            {t("pageLoading")}
          </p>
          <PageLoader />
        </div>
      ) : null}
    </NavigationLoadingContext.Provider>
  );
}

export function NavigationLoadingTrigger() {
  const { beginNavigationLoading, endNavigationLoading } =
    useContext(NavigationLoadingContext) ?? {};

  useEffect(() => {
    if (!beginNavigationLoading || !endNavigationLoading) return;
    beginNavigationLoading();
    return () => endNavigationLoading();
  }, [beginNavigationLoading, endNavigationLoading]);

  return null;
}
