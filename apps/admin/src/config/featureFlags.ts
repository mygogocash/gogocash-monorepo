// Pre-launch feature-flag gating for the admin panel. Contract mirrors the
// customer app's src/config/featureFlags.ts EXACTLY: each surface ships ENABLED
// by default and ONLY the literal string "0" hides it, so an unset env can never
// regress an existing build.
//
// NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so a
// DIRECT static property read (process.env.NEXT_PUBLIC_ENABLE_*) is required —
// a dynamic read (process.env[name]) would NOT be inlined and would evaluate to
// undefined in the browser (which reads as "enabled" and would leak the surface,
// but only client-side; the server page-guard would still 404). Every accessor
// below references the literal statically. Declare each flag as a build ARG in
// the Railway Dockerfile or Next never sees it.
//
// Flags:
//   NEXT_PUBLIC_ENABLE_CREDIT_SCORE -> "My Rating Score" / credit-score surface
//   NEXT_PUBLIC_ENABLE_GOGOPASS     -> Membership + Subscription + /gogopass

function resolveFeatureEnabled(value: string | undefined): boolean {
  return value !== "0";
}

export function resolveCreditScoreEnabled(value: string | undefined): boolean {
  return resolveFeatureEnabled(value);
}

export function resolveGoGoPassEnabled(value: string | undefined): boolean {
  return resolveFeatureEnabled(value);
}

export function isCreditScoreEnabled(): boolean {
  return resolveFeatureEnabled(process.env.NEXT_PUBLIC_ENABLE_CREDIT_SCORE);
}

export function isGoGoPassEnabled(): boolean {
  return resolveFeatureEnabled(process.env.NEXT_PUBLIC_ENABLE_GOGOPASS);
}

/**
 * Which admin routes are hidden by which flag. Shared by every nav surface
 * (sidebar submenu, in-page section tabs) so no entry can be missed when a flag
 * flips. Sidebar sub-items key off `path`; section tabs key off `href` — the
 * filter reads whichever key is present.
 */
const ADMIN_ROUTE_FEATURE_GATES: ReadonlyArray<{
  route: string;
  enabled: () => boolean;
}> = [
  { route: "/credit-score", enabled: isCreditScoreEnabled },
  { route: "/membership", enabled: isGoGoPassEnabled },
  { route: "/subscription", enabled: isGoGoPassEnabled },
  { route: "/gogopass", enabled: isGoGoPassEnabled },
];

export function filterHiddenAdminItems<
  T extends { path?: string; href?: string },
>(items: readonly T[]): T[] {
  return items.filter((item) => {
    const route = item.path ?? item.href;
    const gate = ADMIN_ROUTE_FEATURE_GATES.find((g) => g.route === route);
    return gate ? gate.enabled() : true;
  });
}
