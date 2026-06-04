export type MoneyInput = number | string | null | undefined;

/**
 * Format a monetary amount as `"<number> <CODE>"` (currency code as a suffix),
 * e.g. `149 THB`, `1,234.50 USD`. The house style across the admin is the ISO
 * code after the amount — never a symbol (฿/$).
 *
 * @param amount   number, numeric string, or nullish
 * @param currency ISO code (uppercased); defaults to THB
 * @param decimals when set, fixes min & max fraction digits; otherwise uses
 *                 locale defaults (integers show no decimals)
 * @param fallback returned for null/undefined/unparseable amounts
 */
export function formatMoney(
  amount: MoneyInput,
  currency = "THB",
  { decimals, fallback = "N/A" }: { decimals?: number; fallback?: string } = {},
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (n == null || Number.isNaN(n)) return fallback;
  const code = (currency || "THB").trim().toUpperCase() || "THB";
  const num = n.toLocaleString(
    "en-US",
    decimals != null
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {},
  );
  return `${num} ${code}`;
}
