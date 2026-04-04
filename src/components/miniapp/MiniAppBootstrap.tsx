"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { detectMiniAppHost, isLikelyInAppBrowser } from "@/lib/miniapp/detect";
import InAppBrowserHint from "./InAppBrowserHint";
import { GC_IN_APP_HINT_SESSION_KEY } from "@/lib/miniapp/constants";

function initTelegramWebApp(): void {
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } };
    }
  ).Telegram?.WebApp;
  if (!tg) return;
  try {
    tg.ready?.();
    tg.expand?.();
  } catch {
    /* ignore */
  }
}

/**
 * Sets documentElement data attributes for host detection and runs Telegram Web App helpers.
 */
export default function MiniAppBootstrap() {
  const pathname = usePathname();
  const [hintClosed, setHintClosed] = useState(false);

  const hideForRoute =
    pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth");

  useEffect(() => {
    const host = detectMiniAppHost();
    document.documentElement.dataset.gcHost = host;
    if (host === "telegram") {
      initTelegramWebApp();
    }
    return () => {
      delete document.documentElement.dataset.gcHost;
    };
  }, []);

  const showHint = useMemo(() => {
    if (hintClosed) return false;
    if (hideForRoute) return false;
    if (typeof window === "undefined") return false;
    if (!isLikelyInAppBrowser()) return false;
    try {
      if (sessionStorage.getItem(GC_IN_APP_HINT_SESSION_KEY)) return false;
    } catch {
      /* ignore */
    }
    return true;
  }, [hideForRoute, hintClosed]);

  if (!showHint) return null;

  return <InAppBrowserHint onDismissSession={() => setHintClosed(true)} />;
}
