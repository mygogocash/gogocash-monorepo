export interface UserCreditData {
  monthlySpend: number;
  monthlyTransactionCount: number;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  profileComplete: boolean;
  trustedStreakMonths: number;
  streakRewardStatus: "none" | "earned" | "redeemed" | "expired";
  streakRewardExpiresAt?: string;
  lastTrustedMonth?: string;
}

export const TIERS = {
  starter: {
    key: "starter",
    label: "Starter",
    emoji: "⭐",
    min: 0,
    max: 79,
    color: "#b2bec3",
    bgColor: "bg-gray-100",
    textColor: "text-gray-600",
  },
  trusted: {
    key: "trusted",
    label: "Trusted",
    emoji: "💜",
    min: 80,
    max: 100,
    color: "#6c5ce7",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
  },
} as const;

export type TierKey = keyof typeof TIERS;
export type Tier = (typeof TIERS)[TierKey];

export type ScoreBreakdownRowId = "spend" | "transactions" | "email" | "phone" | "profile";

export type ScoreBreakdownRow = {
  id: ScoreBreakdownRowId;
  label: string;
  subLabel?: string;
  earnedPts: number;
  maxPts: number;
  isComplete: boolean;
  ctaLabel?: string;
  ctaHref?: string;
};

function getSpendPoints(spend: number): number {
  const normalized = Math.max(0, spend);
  return (Math.min(normalized, 3000) / 3000) * 40;
}

function getTransactionPoints(count: number): number {
  const normalized = Math.max(0, Math.floor(count));
  return (Math.min(normalized, 10) / 10) * 20;
}

export function calculateCreditScore(user: UserCreditData): number {
  const spend = getSpendPoints(user.monthlySpend);
  const transactions = getTransactionPoints(user.monthlyTransactionCount);
  const email = user.emailVerified ? 20 : 0;
  const phone = user.phoneNumberVerified ? 20 : 0;
  const profile = user.profileComplete ? 20 : 0;
  return Math.round(Math.min(100, spend + transactions + email + phone + profile));
}

export function getTier(score: number): Tier {
  const safeScore = Math.max(0, Math.min(100, score));
  return safeScore >= TIERS.trusted.min ? TIERS.trusted : TIERS.starter;
}

export function getPointsToTrusted(score: number): number | null {
  const safeScore = Math.max(0, Math.min(100, score));
  if (safeScore >= TIERS.trusted.min) return null;
  return TIERS.trusted.min - safeScore;
}

export function getScoreBreakdown(user: UserCreditData): ScoreBreakdownRow[] {
  const spend = Math.round(getSpendPoints(user.monthlySpend) * 10) / 10;
  const transactions = Math.round(getTransactionPoints(user.monthlyTransactionCount) * 10) / 10;
  const spendAmount = Math.round(Math.max(0, user.monthlySpend));

  return [
    {
      id: "spend",
      label: "Monthly spend ≥ ฿3,000",
      subLabel:
        spendAmount >= 3000
          ? `฿${spendAmount.toLocaleString("en-US")} this month`
          : `฿${spendAmount.toLocaleString("en-US")} / ฿3,000`,
      earnedPts: spend,
      maxPts: 40,
      isComplete: spendAmount >= 3000,
      ctaLabel: spendAmount >= 3000 ? undefined : "Start earning →",
      ctaHref: spendAmount >= 3000 ? undefined : "/",
    },
    {
      id: "transactions",
      label: "10+ transactions",
      subLabel: `${Math.max(0, Math.floor(user.monthlyTransactionCount))} transactions this month`,
      earnedPts: transactions,
      maxPts: 20,
      isComplete: user.monthlyTransactionCount >= 10,
      ctaLabel: user.monthlyTransactionCount >= 10 ? undefined : "Start earning →",
      ctaHref: user.monthlyTransactionCount >= 10 ? undefined : "/",
    },
    {
      id: "email",
      label: "Email verified",
      earnedPts: user.emailVerified ? 20 : 0,
      maxPts: 20,
      isComplete: user.emailVerified,
      ctaLabel: user.emailVerified ? undefined : "Verify now →",
      ctaHref: user.emailVerified ? undefined : "/profile/info",
    },
    {
      id: "phone",
      label: "Phone verified",
      earnedPts: user.phoneNumberVerified ? 20 : 0,
      maxPts: 20,
      isComplete: user.phoneNumberVerified,
      ctaLabel: user.phoneNumberVerified ? undefined : "Verify now →",
      ctaHref: user.phoneNumberVerified ? undefined : "/profile/verify-phone",
    },
    {
      id: "profile",
      label: "Profile complete",
      earnedPts: user.profileComplete ? 20 : 0,
      maxPts: 20,
      isComplete: user.profileComplete,
      ctaLabel: user.profileComplete ? undefined : "Complete profile →",
      ctaHref: user.profileComplete ? undefined : "/profile/info",
    },
  ];
}

export function getStreakExpiryDays(expiresAt: string): number {
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return 0;
  const msRemaining = expires - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
}
