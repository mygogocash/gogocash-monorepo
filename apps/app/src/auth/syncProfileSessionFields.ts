import type { UserProfileResponse } from "@mobile/api/profileTypes";
import { notifyMobileSessionChange } from "@mobile/auth/session";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";

/** Merge avatar_url from GET /user/profile into the persisted session. */
export async function syncProfileSessionFields(
  profile: UserProfileResponse,
): Promise<void> {
  const sessionStore = await getSharedSessionStore();
  if (!sessionStore) {
    return;
  }

  const session = (await sessionStore.getSession()) ?? {};
  const nextSession = { ...session };
  let changed = false;

  const avatarUrl =
    typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";
  if (avatarUrl && session.avatar_url !== avatarUrl) {
    nextSession.avatar_url = avatarUrl;
    changed = true;
  }

  const username = profile.username?.trim();
  if (username && session.username !== username) {
    nextSession.username = username;
    changed = true;
  }

  const wallet =
    typeof profile.wallet === "number" && Number.isFinite(profile.wallet)
      ? String(profile.wallet)
      : typeof profile.wallet === "string" && profile.wallet.trim()
        ? profile.wallet.trim()
        : "";
  if (wallet && session.wallet !== wallet) {
    nextSession.wallet = wallet;
    changed = true;
  }

  const membershipTier =
    typeof profile.membership_tier === "string" ? profile.membership_tier.trim() : "";
  if (membershipTier && session.membership_tier !== membershipTier) {
    nextSession.membership_tier = membershipTier;
    changed = true;
  }

  if (!changed) {
    return;
  }

  await sessionStore.setSession(nextSession);
  notifyMobileSessionChange();
}
