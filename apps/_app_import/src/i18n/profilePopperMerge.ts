/**
 * Profile nav / header popper: ensure keys exist if locale JSON is stale (Turbopack HMR).
 * Mirrors `withdrawCtaMerge.ts` / `headerSearchMerge.ts`.
 */
export const PROFILE_POPPER_MESSAGE_KEYS = [
  "profilePopperGogoquestHistory",
  "navPrivacyPolicy",
] as const;

const FALLBACK_EN: Record<(typeof PROFILE_POPPER_MESSAGE_KEYS)[number], string> = {
  profilePopperGogoquestHistory: "GoGoQuest History",
  navPrivacyPolicy: "Consent preferences",
};

const FALLBACK_TH: Record<(typeof PROFILE_POPPER_MESSAGE_KEYS)[number], string> = {
  profilePopperGogoquestHistory: "ประวัติ GoGoQuest",
  navPrivacyPolicy: "การตั้งค่าความยินยอม",
};

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

export function mergeProfilePopperMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const fallbacks = catalog === "th" ? FALLBACK_TH : FALLBACK_EN;
  const out: Record<string, unknown> = { ...base };
  for (const key of PROFILE_POPPER_MESSAGE_KEYS) {
    if (isMissing(out[key])) {
      out[key] = fallbacks[key];
    }
  }
  return out;
}
