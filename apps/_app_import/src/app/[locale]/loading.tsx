/**
 * Locale route `loading.tsx` Suspense fallback.
 *
 * We intentionally render **nothing** here (same idea as `(profile)/loading.tsx`):
 * `NavigationLoadingTrigger` + `NavigationLoadingProvider` could leave the full-screen
 * truck loader stuck (min 3s overlay, depth / Strict Mode / streaming edge cases).
 * Pages paint immediately; route transitions rely on layout chrome instead.
 */
export default function Loading() {
  return null;
}
