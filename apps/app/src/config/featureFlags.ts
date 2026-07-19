// GoGoPass rollout flag — mirrors the EXPO_PUBLIC_ENABLE_GOTOTRACK contract
// (app.config.js): the surface ships ENABLED by default and ONLY the literal
// string "0" hides it, so an unset env can never regress existing builds.
// eas.json pins "0" on the `beta` profile only (Railway beta rollout).
//
// EXPO_PUBLIC_* vars are inlined into the JS bundle at build time, so a direct
// process.env read (the same pattern src/config/env.ts uses) is available to
// components at render time — no expo-constants extra plumbing needed.

export function resolveGoGoPassEnabled(value: string | undefined): boolean {
  return value !== "0";
}

export function isGoGoPassEnabled(): boolean {
  return resolveGoGoPassEnabled(process.env.EXPO_PUBLIC_ENABLE_GOGOPASS);
}

/**
 * Drops the GoGoPass (/membership) row when the flag hides the feature.
 * Shared by ALL profileHubMenuItems consumers (profile hub, desktop rail,
 * account popover) so no menu surface can be missed when the flag flips.
 */
export function filterGoGoPassMenuItems<T extends { readonly href: string }>(
  items: readonly T[]
): readonly T[] {
  return isGoGoPassEnabled() ? items : items.filter((item) => item.href !== "/membership");
}
