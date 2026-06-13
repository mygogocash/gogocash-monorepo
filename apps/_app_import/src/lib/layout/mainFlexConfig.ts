/**
 * `<main>` flex behavior in `ClientLayoutWrapper`: some flows read better with `flex-none`
 * (content-height) instead of stretching (`flex-1`).
 */
export const MAIN_FLEX_NONE_EXACT_PATHS = new Set<string>([
  "/link-mycashback",
  "/shop",
  "/discover",
  "/golink",
]);

/** Path must start with one of these (after exact-path check). */
export const MAIN_FLEX_NONE_PATH_PREFIXES: readonly string[] = ["/shop/"];

export function isMainFlexNonePath(pathname: string): boolean {
  if (MAIN_FLEX_NONE_EXACT_PATHS.has(pathname)) return true;
  return MAIN_FLEX_NONE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
