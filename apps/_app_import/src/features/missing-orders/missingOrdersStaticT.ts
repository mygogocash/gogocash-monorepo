import en from "@/messages/en.json";
import jp from "@/messages/jp.json";
import th from "@/messages/th.json";

/**
 * Resolves copy from static locale JSON (flat keys) so Turbopack/HMR cannot strip keys from
 * `next-intl` `messages` and trigger MISSING_MESSAGE.
 *
 * Order: primary catalog for `locale`, then English. Use for all strings on the missing-orders
 * flow (not only `missingOrders*` keys) so this file stays the single escape hatch from `t()`.
 */
export function missingOrdersStaticT(locale: string, key: string): string {
  const primary = (locale === "th" ? th : locale === "jp" ? jp : en) as Record<string, unknown>;
  const raw = primary[key];
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  const fallback = (en as Record<string, unknown>)[key];
  return typeof fallback === "string" && fallback.length > 0 ? fallback : key;
}
