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

/** Sanitize a typed hour: digits only, max two, clamped to 00–23. */
export function clampHour(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 2);
  return d.length === 2 && Number(d) > 23 ? "23" : d;
}

/** Sanitize a typed minute: digits only, max two, clamped to 00–59. */
export function clampMinute(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 2);
  return d.length === 2 && Number(d) > 59 ? "59" : d;
}

/** Split a stored `HH:MM` (or partial) into its hour / minute parts. */
export function splitHHMM(value: string): { hh: string; mm: string } {
  const [hh = "", mm = ""] = (value ?? "").split(":");
  return { hh, mm };
}

/** Join hour / minute parts; empty string when both are blank. */
export function joinHHMM(hh: string, mm: string): string {
  return hh === "" && mm === "" ? "" : `${hh}:${mm}`;
}

/** Left-pad a non-empty time part to two digits (blur tidy-up). */
export function padTimePart(s: string): string {
  return s === "" ? "" : s.padStart(2, "0");
}
