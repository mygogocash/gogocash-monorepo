/**
 * Calendar month key `YYYY-MM` → inclusive UTC `en-CA` dates (`YYYY-MM-DD`) for API paths.
 */
export function monthKeyToRangeEnCA(monthKey: string): { start: string; end: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(y) || m < 1 || m > 12) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${y}-${pad(m)}-01`;
  /** `m` is calendar month 1–12; `Date.UTC(y, m, 0)` is the last UTC day of that month. */
  const lastDayUtc = new Date(Date.UTC(y, m, 0));
  const end = `${y}-${pad(lastDayUtc.getUTCMonth() + 1)}-${pad(lastDayUtc.getUTCDate())}`;
  return { start, end };
}
