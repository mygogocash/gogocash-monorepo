import type { TierKey } from "./scoreCalculator";

/** i18n message keys under `creditScore` namespace — `benefit_*` */
export type BenefitId =
  | "basic_cashback"
  | "standard_payout"
  | "quest_15"
  | "priority_support"
  | "payout_1d"
  | "quest_3x"
  | "instant_payout"
  | "referral_3x"
  | "concierge"
  | "prestige"
  | "micro_credit";

const STANDARD: BenefitId[] = ["basic_cashback", "standard_payout"];
const TRUSTED_EXTRA: BenefitId[] = ["quest_15", "priority_support", "payout_1d"];
const DIAMOND_EXTRA: BenefitId[] = [
  "quest_3x",
  "instant_payout",
  "referral_3x",
  "concierge",
  "prestige",
];
const FUTURE: BenefitId[] = ["micro_credit"];

export function getActiveBenefitIds(tierKey: TierKey): BenefitId[] {
  if (tierKey === "standard") return [...STANDARD];
  if (tierKey === "trusted") return [...STANDARD, ...TRUSTED_EXTRA];
  return [...STANDARD, ...TRUSTED_EXTRA, ...DIAMOND_EXTRA];
}

/** Benefits exclusive to the tier above `current` (empty if Diamond). */
export function getNextTierExclusiveBenefitIds(current: TierKey): BenefitId[] {
  if (current === "standard") return [...TRUSTED_EXTRA];
  if (current === "trusted") return [...DIAMOND_EXTRA];
  return [];
}

export function getFutureBenefitIds(): BenefitId[] {
  return [...FUTURE];
}
