// Pre-launch feature-flag gating for the admin panel. Contract: each surface
// ships ENABLED by default and ONLY the literal string "0" hides it, so an
// unset env can never regress an existing build.
//
// NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so a
// DIRECT static property read (process.env.NEXT_PUBLIC_ENABLE_*) is required —
// a dynamic read (process.env[name]) would NOT be inlined and would evaluate to
// undefined in the browser (which reads as "enabled" and would leak the surface
// client-side). Every accessor below references the literal statically. Declare
// each flag as a build ARG in the Dockerfile or Next never sees it.
//
// Flags:
//   NEXT_PUBLIC_ENABLE_CREDIT_SCORE -> "Tier" (credit tier) column + filter
//   NEXT_PUBLIC_ENABLE_GOGOPASS     -> Membership + Subscription columns + filters

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
