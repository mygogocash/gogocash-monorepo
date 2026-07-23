export const SEARCH_RULE_TREATMENTS = ['pinned', 'boost', 'blocked'] as const;

export type SearchRuleTreatment = (typeof SEARCH_RULE_TREATMENTS)[number];

export function normalizeSearchRuleKeywords(
  keywords: readonly string[] | undefined,
): string[] {
  const normalized = (keywords ?? [])
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized)];
}
