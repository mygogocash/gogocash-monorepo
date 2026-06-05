import type { CreditTier } from "@/types/adminModules";

/**
 * Map a numeric credit score to its tier. Single source of truth shared by the
 * Credit Score module, the mock credit-score generator, and the Users table's
 * Tier column so a user's tier is identical everywhere.
 */
export function tierFromScore(score: number): CreditTier {
  if (score >= 800) return "platinum";
  if (score >= 600) return "gold";
  if (score >= 300) return "silver";
  return "bronze";
}

/** Metal-themed badge colors per credit tier. */
export const CREDIT_TIER_BADGE: Record<CreditTier, string> = {
  bronze:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
  silver: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  platinum: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
};
