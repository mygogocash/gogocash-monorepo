"use client";

import CloseIcon from "@mui/icons-material/Close";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import GoLinkFeature from "@/features/home/component/GoLinkFeature";

interface GoLinkMobileSheetProps {
  onClose: () => void;
}

/**
 * Mobile-only bottom sheet for GoGoLink (paste URL flow).
 * Used by `/golink` route and by `GolinkMobileSheetProvider` when opening from the bottom nav without routing.
 */
export default function GoLinkMobileSheet({ onClose }: GoLinkMobileSheetProps) {
  const t = useTranslations();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const syncLock = () => {
      if (mq.matches) {
        document.documentElement.classList.add("gc-golink-modal-open");
      } else {
        document.documentElement.classList.remove("gc-golink-modal-open");
      }
    };
    syncLock();
    mq.addEventListener("change", syncLock);
    return () => {
      mq.removeEventListener("change", syncLock);
      document.documentElement.classList.remove("gc-golink-modal-open");
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col md:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="golink-banner-heading"
    >
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />
      <div className="relative z-10 mt-auto flex max-h-[min(92dvh,calc(100dvh-12px))] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#f6f6f6] shadow-[0_-12px_40px_rgba(0,0,0,0.18)]">
        {/* Toolbar: min height + grid keeps the handle centered and the close control in-flow (avoids clipping at rounded corners). */}
        <div className="grid shrink-0 grid-cols-[minmax(2.75rem,1fr)_auto_minmax(2.75rem,1fr)] items-center gap-2 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
          <span className="min-w-0" aria-hidden />
          <span className="h-1 w-10 shrink-0 rounded-full bg-[#c9cfcb]" aria-hidden />
          <div className="flex min-h-[2.75rem] items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("golinkModalCloseAria")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-[#3d524c] transition hover:bg-black/[0.08] active:scale-[0.98]"
            >
              <CloseIcon sx={{ fontSize: 24 }} aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 pb-[max(1rem,var(--gc-safe-bottom))] pt-1 [-webkit-overflow-scrolling:touch]">
          <GoLinkFeature variant="modal" />
        </div>
      </div>
    </div>
  );
}
