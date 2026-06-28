// CORS origin allow-list helpers.
//
// The base allow-list lives in main.ts; deploy environments can add extra exact
// origins via the CORS_EXTRA_ORIGINS env var (comma-separated) — e.g. the
// Railway preview hosts (*.up.railway.app) during migration testing and the
// production custom domains — WITHOUT a code change per environment.
//
// This stays a strict EXACT-match allow-list: no wildcards, no suffix/substring
// matching. Empty CORS_EXTRA_ORIGINS reproduces the prior behavior exactly.

/** Parse a comma-separated origins env value into trimmed, non-empty exact origins. */
export function parseExtraOrigins(raw: string | undefined | null): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Build the exact-match allow-set from a base list plus extra origins from env. */
export function buildCorsAllowSet(
  base: readonly string[],
  extraEnv: string | undefined | null,
): Set<string> {
  return new Set<string>([...base, ...parseExtraOrigins(extraEnv)]);
}

/**
 * Exact-match origin check for the CORS `origin` callback.
 * A missing origin (server-to-server requests, curl, same-origin) is allowed,
 * matching the prior behavior; any present origin must match exactly.
 */
export function isCorsOriginAllowed(
  allowSet: ReadonlySet<string>,
  origin: string | undefined,
): boolean {
  if (!origin) return true;
  return allowSet.has(origin);
}
