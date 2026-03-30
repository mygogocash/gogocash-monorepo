/**
 * Detect Firebase / `output: "export"` hosting in the browser.
 * Next may not inline `NEXT_PUBLIC_FIREBASE_STATIC` in all toolchains; the root layout
 * also emits `<meta name="gogocash-static-export" content="1" />` when `BUILD_FOR_FIREBASE=1`.
 */
export function isStaticHostingClient(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_FIREBASE_STATIC === "1") return true;
  try {
    const el = document.querySelector('meta[name="gogocash-static-export"]');
    return el?.getAttribute("content") === "1";
  } catch {
    return false;
  }
}
