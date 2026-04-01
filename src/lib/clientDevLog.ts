"use client";

/**
 * Browser devtools logging gated to development builds only.
 * Production bundles never invoke `console.*` from these helpers (avoids noisy / misleading logs).
 */
function isDevBuild(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function devLogDebug(...args: unknown[]): void {
  if (!isDevBuild()) return;
  console.debug(...args);
}

export function devLogInfo(...args: unknown[]): void {
  if (!isDevBuild()) return;
  console.info(...args);
}

/** Dev-only warnings (e.g. missing i18n keys); never logs in production. */
export function devLogWarn(...args: unknown[]): void {
  if (!isDevBuild()) return;
  console.warn(...args);
}

/** Use for non-fatal diagnostics; never logs in production (keeps the browser console clean). */
export function devLogError(...args: unknown[]): void {
  if (!isDevBuild()) return;
  console.error(...args);
}
