/** Active GoGoPass subscription tiers returned by the backend (`membership_tier`). */
export function isGoGoPassSubscriber(tier?: string | null): boolean {
  return tier === "gogopass" || tier === "gogopass-pro";
}

/** Reads `membership_tier` from session/profile payloads — no mock fallback. */
export function readMembershipTier(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
