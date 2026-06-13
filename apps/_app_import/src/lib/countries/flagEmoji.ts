/** ISO 3166-1 alpha-2 → regional-indicator flag emoji (e.g. TH → 🇹🇭). */
export function countryCodeToFlagEmoji(iso3166Alpha2: string): string {
  const code = iso3166Alpha2?.trim().toUpperCase();
  if (code.length !== 2) return "";
  const base = 0x1f1e6;
  const a = 65;
  const chars = [...code];
  if (!chars.every((c) => c >= "A" && c <= "Z")) return "";
  return String.fromCodePoint(...chars.map((letter) => base + (letter.charCodeAt(0) - a)));
}
