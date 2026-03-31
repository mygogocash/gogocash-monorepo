/**
 * GoGoQuest History: ensure all `gogoquestHistory*` keys are present on the message catalog.
 * Turbopack HMR / RSC serialization can drop flat keys from `messages` while `t("…")` still runs
 * on the client — same class of issue as `withdrawCtaMerge.ts` / `missingOrdersMerge.ts`.
 */
import en from "../messages/en.json";
import th from "../messages/th.json";

const PREFIX = "gogoquestHistory";

export function pickGogoquestHistoryMessages(catalog: "en" | "th"): Record<string, string> {
  const src = catalog === "th" ? th : en;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith(PREFIX) && typeof v === "string") {
      out[k] = v;
    }
  }
  return out;
}

export function mergeGogoquestHistoryMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const patch = pickGogoquestHistoryMessages(catalog);
  return { ...base, ...patch };
}
