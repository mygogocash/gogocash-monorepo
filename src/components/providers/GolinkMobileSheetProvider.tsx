"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import GoLinkMobileSheet from "@/features/home/component/GoLinkMobileSheet";
import { usePathname } from "@/i18n/navigation";

type GolinkMobileSheetContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const GolinkMobileSheetContext = createContext<GolinkMobileSheetContextValue | null>(null);

export function useGolinkMobileSheet(): GolinkMobileSheetContextValue {
  const ctx = useContext(GolinkMobileSheetContext);
  if (!ctx) {
    throw new Error("useGolinkMobileSheet must be used within GolinkMobileSheetProvider");
  }
  return ctx;
}

/**
 * Lets mobile bottom nav open the GoGoLink sheet as an overlay without navigating to `/golink`,
 * so the current page stays mounted “under” the sheet.
 */
export function GolinkMobileSheetProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Avoid stacking this sheet on top of the `/golink` route modal (two instances). */
  useEffect(() => {
    if (pathname !== "/golink") return;
    startTransition(() => setIsOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onPopState = () => setIsOpen(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isOpen]);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <GolinkMobileSheetContext.Provider value={value}>
      {children}
      {isOpen ? <GoLinkMobileSheet onClose={close} /> : null}
    </GolinkMobileSheetContext.Provider>
  );
}
