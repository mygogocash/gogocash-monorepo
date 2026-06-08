/**
 * Format raw typed input into a 24-hour `HH:MM` time as the user types.
 * Strips non-digits, caps at four digits, auto-inserts the colon after the
 * hours, and clamps hours to 00–23 and minutes to 00–59. Returns "" when empty.
 * Used for the upsize period time fields (native <input type=time> can't be
 * forced to 24h across browsers, so we drive a plain text field instead).
 */
export function formatTime24Input(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length === 0) return "";
  let hh = d.slice(0, 2);
  let mm = d.slice(2, 4);
  if (hh.length === 2 && Number(hh) > 23) hh = "23";
  if (mm.length === 2 && Number(mm) > 59) mm = "59";
  return d.length <= 2 ? hh : `${hh}:${mm}`;
}
