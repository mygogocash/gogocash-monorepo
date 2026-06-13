export type CreditTierUi = "standard" | "trusted" | "diamond";

export function creditScoreToTierUi(creditScoreType: number): CreditTierUi {
  if (creditScoreType === 2) return "diamond";
  if (creditScoreType === 1) return "trusted";
  return "standard";
}

/** Tier pill on light surfaces (profile rating card). */
export const TIER_PILL_LIGHT: Record<CreditTierUi, string> = {
  standard: "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80",
  trusted: "bg-violet-100 text-violet-900 ring-1 ring-violet-200/90",
  diamond: "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90",
};
