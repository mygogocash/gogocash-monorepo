import type { UserProfileResponse } from "@mobile/api/profileTypes";
import { readMembershipTier } from "@mobile/lib/membershipTier";

// View-model the profile wallet hero consumes — same shape the session
// overlay produces, so precedence composes: live payload > session > fixture.
export type ProfileWalletSummary = {
  amount: string;
  currency: string;
  lastUpdated: string | null;
  maskedId: string;
  tier: string;
  userId: string;
  username: string;
};

function maskProfileId(id: string): string {
  const suffix = id.slice(-4).padStart(4, "*");
  return `***${suffix}`;
}

function resolveAmount(wallet: UserProfileResponse["wallet"]): string | null {
  if (typeof wallet === "number" && Number.isFinite(wallet)) {
    return String(wallet);
  }
  if (typeof wallet === "string" && wallet.trim()) {
    return wallet.trim();
  }
  return null;
}

/**
 * Maps the raw backend user doc onto the wallet-hero summary, falling back per
 * field for everything a fresh account hasn't set yet. The masked id never
 * falls back — the live doc always carries a real _id.
 */
export function mapUserProfileToWalletSummary(
  profile: UserProfileResponse,
  fallback: ProfileWalletSummary
): ProfileWalletSummary {
  return {
    amount: resolveAmount(profile.wallet) ?? fallback.amount,
    currency: fallback.currency,
    lastUpdated: fallback.lastUpdated,
    maskedId: maskProfileId(profile._id),
    tier: readMembershipTier(profile.membership_tier) ?? readMembershipTier(fallback.tier) ?? "",
    userId: profile._id,
    username: profile.username?.trim() || fallback.username,
  };
}
