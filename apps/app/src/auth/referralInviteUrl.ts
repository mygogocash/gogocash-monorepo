import { profileInviteUrl, webReferralPage } from "@mobile/design/webDesignParity";

export function buildReferralInviteUrl(frontendUrl: string, userId: string): string {
  const base = frontendUrl.replace(/\/+$/, "");
  return `${base}/?referral_id=${encodeURIComponent(userId.trim())}`;
}

export function formatInviteLinkDisplay(url: string, head = 22, tail = 14): string {
  if (url.length <= head + tail + 1) {
    return url;
  }

  return `${url.slice(0, head)}…${url.slice(-tail)}`;
}

export function resolveReferralInviteLink({
  frontendUrl,
  userId,
  useFixtures,
}: {
  frontendUrl: string;
  userId?: string | null;
  useFixtures: boolean;
}): { displayLink: string; inviteUrl: string; referralCode: string } {
  if (useFixtures || !userId?.trim()) {
    return {
      displayLink: webReferralPage.earn.displayLink,
      inviteUrl: profileInviteUrl,
      referralCode: (profileInviteUrl.split("/").pop() ?? "").toUpperCase(),
    };
  }

  const inviteUrl = buildReferralInviteUrl(frontendUrl, userId);
  return {
    displayLink: formatInviteLinkDisplay(inviteUrl),
    inviteUrl,
    referralCode: userId.trim().toUpperCase(),
  };
}

export function isReferralResourceBlocking(
  status: "disabled" | "empty" | "error" | "loading" | "offline" | "ready",
): boolean {
  return status === "loading" || status === "error" || status === "offline" || status === "disabled";
}
