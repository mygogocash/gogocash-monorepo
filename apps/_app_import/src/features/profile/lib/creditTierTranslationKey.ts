/** Message key for tier label from API `creditScoreType`. */
export function creditTierTranslationKey(
  creditScoreType: number
): "profileRatingTierStandard" | "profileRatingTierTrusted" | "profileRatingTierDiamond" {
  if (creditScoreType === 2) return "profileRatingTierDiamond";
  if (creditScoreType === 1) return "profileRatingTierTrusted";
  return "profileRatingTierStandard";
}
