/**
 * Detect Firebase / `output: "export"` hosting in the browser WITH mock data mode.
 *
 * Returns true only when the build was marked as a static-mock export AND
 * no real API URL is configured. When `NEXT_PUBLIC_API_URL` is set, we're
 * pointing at a real backend — static-hosting mock shims must stay inactive.
 *
 * Next may not inline `NEXT_PUBLIC_FIREBASE_STATIC` in all toolchains; the root
 * layout also emits `<meta name="gogocash-static-export" content="1" />` when
 * `BUILD_FOR_FIREBASE=1`.
 */
export function isStaticHostingClient(): boolean {
  if (typeof window === "undefined") return false;
  // Real API configured → not in static-mock mode regardless of flags.
  if (process.env.NEXT_PUBLIC_API_URL) return false;
  if (process.env.NEXT_PUBLIC_FIREBASE_STATIC === "1") return true;
  try {
    const el = document.querySelector('meta[name="gogocash-static-export"]');
    return el?.getAttribute("content") === "1";
  } catch {
    return false;
  }
}
