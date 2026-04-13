/** Tier thresholds on 0–100 score scale (aligned with product spec). */
export type TierKey = "standard" | "trusted" | "diamond";

export type TierDefinition = {
  key: TierKey;
  min: number;
  max: number;
  color: string;
  emoji: string;
};

export const TIERS: Record<TierKey, TierDefinition> = {
  standard: { key: "standard", min: 0, max: 49, color: "#636e72", emoji: "⭐" },
  trusted: { key: "trusted", min: 50, max: 79, color: "#6c5ce7", emoji: "💜" },
  diamond: { key: "diamond", min: 80, max: 100, color: "#fdcb6e", emoji: "💎" },
} as const;

export type CreditScoreInput = {
  transactionCount: number;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  profileComplete: boolean;
};

/** Max points from shopping activity (51+ qualifying transactions = cap). */
const TRANSACTION_CAP = 51;

export function transactionPoints(count: number): number {
  const n = Math.max(0, Math.floor(count));
  if (n <= 0) return 0;
  if (n <= 20) return (n / TRANSACTION_CAP) * 20;
  if (n <= 50) return (n / TRANSACTION_CAP) * 40;
  return 40;
}

export function calculateCreditScore(user: CreditScoreInput): number {
  const tx = transactionPoints(user.transactionCount);
  const email = user.emailVerified ? 20 : 0;
  const phone = user.phoneNumberVerified ? 20 : 0;
  const profile = user.profileComplete ? 20 : 0;
  const raw = tx + email + phone + profile;
  return Math.min(100, Math.round(raw));
}

export function getTier(score: number): TierDefinition {
  const s = Math.min(100, Math.max(0, score));
  if (s >= TIERS.diamond.min) return TIERS.diamond;
  if (s >= TIERS.trusted.min) return TIERS.trusted;
  return TIERS.standard;
}

export function getTierKey(score: number): TierKey {
  return getTier(score).key;
}

/** Points needed to reach the next tier; `null` when already Diamond. */
export function getPointsToNextTier(score: number): number | null {
  const s = Math.min(100, Math.max(0, score));
  if (s >= TIERS.diamond.min) return null;
  if (s >= TIERS.trusted.min) return TIERS.diamond.min - s;
  return TIERS.trusted.min - s;
}

/** Minimum score for the next tier (50 for Trusted, 80 for Diamond). */
export function getNextTierThreshold(score: number): number | null {
  if (score >= TIERS.diamond.min) return null;
  if (score >= TIERS.trusted.min) return TIERS.diamond.min;
  return TIERS.trusted.min;
}

export function getNextTierKey(current: TierKey): TierKey | null {
  if (current === "standard") return "trusted";
  if (current === "trusted") return "diamond";
  return null;
}

export type BreakdownRowId = "transactions" | "email" | "phone" | "profile";

export type ScoreBreakdownRow = {
  id: BreakdownRowId;
  earnedPts: number;
  maxPts: number;
  isComplete: boolean;
  /** For transaction sub-label. */
  transactionCount?: number;
};

export function getScoreBreakdown(user: CreditScoreInput): ScoreBreakdownRow[] {
  const txEarned = transactionPoints(user.transactionCount);
  return [
    {
      id: "transactions",
      earnedPts: Math.round(txEarned * 10) / 10,
      maxPts: 40,
      isComplete: user.transactionCount >= TRANSACTION_CAP,
      transactionCount: user.transactionCount,
    },
    {
      id: "email",
      earnedPts: user.emailVerified ? 20 : 0,
      maxPts: 20,
      isComplete: user.emailVerified,
    },
    {
      id: "phone",
      earnedPts: user.phoneNumberVerified ? 20 : 0,
      maxPts: 20,
      isComplete: user.phoneNumberVerified,
    },
    {
      id: "profile",
      earnedPts: user.profileComplete ? 20 : 0,
      maxPts: 20,
      isComplete: user.profileComplete,
    },
  ];
}

/** Progress toward next tier as 0–1 (for progress bar). */
export function getTierProgressRatio(score: number): number {
  const next = getNextTierThreshold(score);
  if (next == null) return 1;
  const prev = score >= TIERS.trusted.min ? TIERS.trusted.min : TIERS.standard.min;
  const span = next - prev;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (score - prev) / span));
}

/** Dots filled in the hero (1 / 3 / 5 by tier). */
export function getTierDotCount(tierKey: TierKey): number {
  if (tierKey === "standard") return 1;
  if (tierKey === "trusted") return 3;
  return 5;
}
