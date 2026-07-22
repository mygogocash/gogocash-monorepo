// Customer-feature rollout flags. Contract (mirrors EXPO_PUBLIC_ENABLE_GOTOTRACK
// in app.config.js): each surface ships ENABLED by default and ONLY the literal
// string "0" hides it, so an unset env can never regress existing builds.
// eas.json pins the "0"s on the `beta` profile; the web build must also declare
// each EXPO_PUBLIC_ENABLE_* as a build ARG in Dockerfile.web.railway or Metro
// never sees it (an omitted ARG = undefined = enabled — the beta GoGoPass leak).
//
// EXPO_PUBLIC_* vars are inlined into the JS bundle at build time, so a direct
// process.env read (the same pattern src/config/env.ts uses) is available to
// components at render time — no expo-constants extra plumbing needed.

function resolveFeatureEnabled(value: string | undefined): boolean {
  return value !== "0";
}

export function resolveGoGoPassEnabled(value: string | undefined): boolean {
  return resolveFeatureEnabled(value);
}

export function isGoGoPassEnabled(): boolean {
  return resolveFeatureEnabled(process.env.EXPO_PUBLIC_ENABLE_GOGOPASS);
}

export function resolveCreditScoreEnabled(value: string | undefined): boolean {
  return resolveFeatureEnabled(value);
}

export function isCreditScoreEnabled(): boolean {
  return resolveFeatureEnabled(process.env.EXPO_PUBLIC_ENABLE_CREDIT_SCORE);
}

export function isGoGoTrackEnabled(): boolean {
  return resolveFeatureEnabled(process.env.EXPO_PUBLIC_ENABLE_GOTOTRACK);
}

export function isGoLinkEnabled(): boolean {
  return resolveFeatureEnabled(process.env.EXPO_PUBLIC_ENABLE_GOLINK);
}

// Which profile menu hrefs are hidden by which flag. Shared by ALL
// profileHubMenuItems consumers (profile hub, desktop rail, account popover) so
// no menu surface can be missed when a flag flips.
const PROFILE_MENU_FEATURE_GATES: ReadonlyArray<{
  href: string;
  enabled: () => boolean;
}> = [
  { href: "/membership", enabled: isGoGoPassEnabled },
  { href: "/gototrack", enabled: isGoGoTrackEnabled },
  // "My Rating Score" lives in profileHubSubNavItems (the Profile accordion),
  // not the top-level menu — filterHiddenProfileMenuItems is generic over
  // { href } so the same gate list covers both arrays.
  { href: "/credit-score", enabled: isCreditScoreEnabled },
];

export function filterHiddenProfileMenuItems<
  T extends { readonly href: string },
>(items: readonly T[]): readonly T[] {
  return items.filter((item) => {
    const gate = PROFILE_MENU_FEATURE_GATES.find((g) => g.href === item.href);
    return gate ? gate.enabled() : true;
  });
}

/**
 * @deprecated use filterHiddenProfileMenuItems — retained so any straggler
 * import keeps compiling; delegates to the unified filter.
 */
export const filterGoGoPassMenuItems = filterHiddenProfileMenuItems;

/** Drops the GoGoLink (/golink) tab from the mobile bottom nav when hidden. */
export function filterHiddenBottomNavItems<
  T extends { readonly href: string },
>(items: readonly T[]): readonly T[] {
  return isGoLinkEnabled()
    ? items
    : items.filter((item) => item.href !== "/golink");
}
