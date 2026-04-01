/**
 * Shop detail cashback tips illustration: Turbopack / RSC serialization can drop flat keys from
 * `messages` while `t("merchantCashbackTipsIllustrationAlt")` runs on the client — same class of
 * issue as `gogoquestHistoryMerge.ts`.
 */
import en from "../messages/en.json";
import th from "../messages/th.json";

const KEYS = ["merchantCashbackTipsIllustrationAlt"] as const;

export function mergeMerchantCashbackTipsMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const src = catalog === "th" ? th : en;
  const out: Record<string, unknown> = { ...base };
  for (const key of KEYS) {
    const v = (src as Record<string, unknown>)[key];
    if (typeof v === "string" && v.length > 0) {
      out[key] = v;
    }
  }
  return out;
}
