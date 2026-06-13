/**
 * Missing Orders page: ensure keys exist if locale JSON is stale or Turbopack HMR omits flat keys
 * from serialized `messages` (same class of issue as `withdrawCtaMerge.ts`).
 */
import en from "../messages/en.json";
import th from "../messages/th.json";

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function keysStartingWith(obj: Record<string, unknown>, prefix: string): string[] {
  return Object.keys(obj).filter((k) => k.startsWith(prefix));
}

export function mergeMissingOrdersMessages(
  base: Record<string, unknown>,
  catalog: "en" | "th"
): Record<string, unknown> {
  const src = (catalog === "th" ? th : en) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const key of keysStartingWith(src, "missingOrders")) {
    if (isMissing(out[key]) && !isMissing(src[key])) {
      out[key] = src[key];
    }
  }
  return out;
}
