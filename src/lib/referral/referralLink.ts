import { env } from "@/env";

/** Public site origin for referral links: env first, then browser (client fallback). */
export function referralSiteOriginFromEnv(): string {
  return env.NEXT_PUBLIC_FRONTEND_URL?.trim().replace(/\/$/, "") ?? "";
}

export function referralSiteOriginFromWindow(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin.replace(/\/$/, "");
}

export function buildReferralInviteUrl(siteOrigin: string, userId: string): string {
  if (!siteOrigin || !userId) return "";
  return `${siteOrigin}/?referral_id=${encodeURIComponent(userId)}`;
}

/** Middle truncation for long URLs (avoid `formatAddress`, which reads like a wallet). */
export function formatInviteLinkDisplay(url: string, headChars = 22, tailChars = 14): string {
  if (!url) return "";
  const minLen = headChars + tailChars + 1;
  if (url.length <= minLen) return url;
  return `${url.slice(0, headChars)}…${url.slice(-tailChars)}`;
}
