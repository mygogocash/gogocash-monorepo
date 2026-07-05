import type { UserProfileResponse } from "@mobile/api/profileTypes";
import { notifyMobileSessionChange } from "@mobile/auth/session";
import { getSharedSessionStore } from "@mobile/auth/sharedSessionStore";

/** Merge avatar_url from GET /user/profile into the persisted session. */
export async function syncProfileSessionFields(
  profile: UserProfileResponse,
): Promise<void> {
  const avatarUrl =
    typeof profile.avatar_url === "string" ? profile.avatar_url.trim() : "";
  if (!avatarUrl) {
    return;
  }

  const sessionStore = await getSharedSessionStore();
  if (!sessionStore) {
    return;
  }

  const session = (await sessionStore.getSession()) ?? {};
  if (session.avatar_url === avatarUrl) {
    return;
  }

  await sessionStore.setSession({
    ...session,
    avatar_url: avatarUrl,
  });
  notifyMobileSessionChange();
}
