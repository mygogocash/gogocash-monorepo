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

// #586 — Involve Commission Xtra shops on the Explore Shops directory. Same
// "only the literal '0' hides it" contract; eas.json pins "0" on the beta
// profile until the Involve Publisher API key (Shopee TH) is approved, so the
// surface stays dark by default. When on but the feed is empty/errors, the
// mapper yields no stores and the directory shows the existing offer path
// (REQ-APP-7 fallback) — never a blank rail.
export function resolveInvolveXtraShopsEnabled(
  value: string | undefined,
): boolean {
  return resolveFeatureEnabled(value);
}

export function isInvolveXtraShopsEnabled(): boolean {
  return resolveFeatureEnabled(
    process.env.EXPO_PUBLIC_ENABLE_INVOLVE_XTRA_SHOPS,
  );
}

// ── GoLink 3-state rollout (2026-07) ────────────────────────────────────────
// Founder decision: GoLink ships VISIBLE but NON-CLICKABLE ("coming soon") on
// mobile until launch. Two env vars compose the mode:
//   EXPO_PUBLIC_ENABLE_GOLINK === "0"   -> "hidden"     (fully removed; wins over all)
//   EXPO_PUBLIC_GOLINK_COMING_SOON      -> "comingSoon" by DEFAULT; only "0" opts out
//   otherwise                           -> "enabled"    (fully clickable / live flow)
// Coming-soon DEFAULTS ON so beta flips into the coming-soon state with NO env
// change. TO FULLY LAUNCH GoLink later, set EXPO_PUBLIC_GOLINK_COMING_SOON=0.
export type GoLinkMode = "hidden" | "comingSoon" | "enabled";

// Mirrors the "only the literal '0' flips it" contract above, but INVERTED: this
// flag defaults ON (coming-soon), so an unset env can never accidentally ship the
// live flow before launch — only an explicit "0" opts out into "enabled".
export function isGoLinkComingSoon(): boolean {
  return process.env.EXPO_PUBLIC_GOLINK_COMING_SOON !== "0";
}

export function resolveGoLinkMode(): GoLinkMode {
  if (process.env.EXPO_PUBLIC_ENABLE_GOLINK === "0") {
    return "hidden";
  }
  return isGoLinkComingSoon() ? "comingSoon" : "enabled";
}

// "Enabled" now means the mode is FULLY clickable (live flow) — NOT merely
// "not hidden". Callers gating the live GoLink flow use this; surfaces that must
// stay visible-but-disabled read resolveGoLinkMode() instead.
export function isGoLinkEnabled(): boolean {
  return resolveGoLinkMode() === "enabled";
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

/**
 * Drops the GoGoLink (/golink) tab from the mobile bottom nav ONLY when hidden.
 * In "comingSoon" mode the tab STAYS (rendered disabled/badged by the nav
 * components) so the surface is visible but non-clickable.
 */
export function filterHiddenBottomNavItems<T extends { readonly href: string }>(
  items: readonly T[],
): readonly T[] {
  return resolveGoLinkMode() === "hidden"
    ? items.filter((item) => item.href !== "/golink")
    : items;
}
