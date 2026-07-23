/**
 * Detect Firebase / `output: "export"` hosting in the browser.
 *
 * Two signals:
 * - `isStaticExportBuild()`: true whenever the build is a static export (regardless
 *   of mock vs real API). Used to install auth shims — static exports have no
 *   server-side `/api/auth/*` routes, so NextAuth must be mocked client-side.
 * - `isStaticHostingClient()`: true only when we're in static-export AND using
 *   mock data (no real API URL). Used to route `/api/mock/*` through the mock core.
 *
 * Next may not inline `NEXT_PUBLIC_FIREBASE_STATIC` in all toolchains; the root
 * layout emits `<meta name="gogocash-static-export" content="1" />` when
 * `BUILD_FOR_FIREBASE=1`, which works in every toolchain.
 */

import { isAdminApiConfigured } from "@/lib/adminApiMode";

function hasStaticExportMeta(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const el = document.querySelector('meta[name="gogocash-static-export"]');
    return el?.getAttribute("content") === "1";
  } catch {
    return false;
  }
}

/** True whenever we're running a static-export build (auth shims required). */
export function isStaticExportBuild(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_FIREBASE_STATIC === "1") return true;
  return hasStaticExportMeta();
}

/** True only in static-export AND mock-data mode. */
export function isStaticHostingClient(): boolean {
  if (typeof window === "undefined") return false;
  // Real API configured → not in static-mock mode regardless of build flags.
  if (isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL)) return false;
  return isStaticExportBuild();
}
