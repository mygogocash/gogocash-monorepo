import type { SearchRuleTreatment } from "@/types/adminModules";

export const SEARCH_RULES_QUERY_KEY = ["admin", "search", "rules"] as const;

export const SEARCH_RULE_TREATMENTS: {
  value: SearchRuleTreatment;
  label: string;
}[] = [
  { value: "pinned", label: "Pinned search" },
  { value: "boost", label: "Boost search" },
  { value: "blocked", label: "Blocked search" },
];

export function normalizeSearchRuleKeywords(
  value: string | readonly string[],
): string[] {
  const keywords = typeof value === "string" ? value.split(",") : value;
  return [
    ...new Set(
      keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
    ),
  ];
}
