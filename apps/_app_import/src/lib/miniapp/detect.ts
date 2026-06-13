/**
 * Runtime detection for in-app browsers / mini-app WebViews (LINE, Telegram, generic WebView).
 * Used for UX hints and html[data-gc-host] for optional styling — not for security.
 */

export type MiniAppHost =
  | "browser"
  | "telegram"
  | "line"
  | "facebook"
  | "instagram"
  | "generic_webview";

type MiniAppWindow = {
  navigator?: { userAgent?: string };
  Telegram?: { WebApp?: unknown };
};

function readTelegramWebApp(win: MiniAppWindow | undefined): unknown {
  if (!win) return undefined;
  return win.Telegram?.WebApp;
}

/**
 * Best-effort host classification from UA and known global objects.
 * @param win — override for tests; defaults to `window` in the browser.
 */
export function detectMiniAppHost(win?: MiniAppWindow): MiniAppHost {
  const w = win ?? (typeof window !== "undefined" ? window : undefined);
  if (!w?.navigator) {
    return "browser";
  }

  if (readTelegramWebApp(w) != null) {
    return "telegram";
  }

  const ua = w.navigator.userAgent || "";

  if (/\bLine\//i.test(ua) || /\bLIFE\b/i.test(ua)) {
    return "line";
  }
  if (/FBAN|FBAV|FBIOS|FBSS/i.test(ua)) {
    return "facebook";
  }
  if (/Instagram/i.test(ua)) {
    return "instagram";
  }
  if (/; wv\)/i.test(ua) || /\bWebView\b/i.test(ua)) {
    return "generic_webview";
  }

  return "browser";
}

export function isLikelyInAppBrowser(host: MiniAppHost = detectMiniAppHost()): boolean {
  return host !== "browser";
}
