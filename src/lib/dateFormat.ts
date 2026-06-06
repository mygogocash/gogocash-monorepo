export type DateInput = string | number | Date | null | undefined;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

type CalendarParts = {
  year: number;
  month: number; // 1-12
  day: number;
  /** The backing Date when a time-of-day is available; null for date-only input. */
  date: Date | null;
};

/**
 * Normalises any supported date input into calendar parts.
 *
 * Date-only strings ("yyyy-mm-dd") are parsed verbatim so the displayed
 * calendar day never shifts across timezones (a naive `new Date('2026-06-04')`
 * is UTC midnight and rolls back a day in negative-offset zones). Everything
 * else goes through `Date` and is read in local time, matching the
 * `toLocale*` behaviour these helpers replace.
 */
function toCalendarParts(input: DateInput): CalendarParts | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "string") {
    const m = DATE_ONLY_RE.exec(input);
    if (m) {
      return { year: +m[1], month: +m[2], day: +m[3], date: null };
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    date: d,
  };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** Format a date as `dd/mm/yyyy`. Invalid/empty input yields `fallback`. */
export function formatDate(input: DateInput, fallback = "—"): string {
  const p = toCalendarParts(input);
  if (!p) return fallback;
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

/** Format a date as `mm/yyyy` (month granularity). Invalid/empty → `fallback`. */
export function formatMonthYear(input: DateInput, fallback = "—"): string {
  const p = toCalendarParts(input);
  if (!p) return fallback;
  return `${pad(p.month)}/${p.year}`;
}

/** Format the time-of-day as 24-hour `HH:mm[:ss]`. Date-only input yields `fallback`. */
export function formatTime(
  input: DateInput,
  {
    seconds = true,
    fallback = "",
  }: { seconds?: boolean; fallback?: string } = {},
): string {
  const p = toCalendarParts(input);
  if (!p || !p.date) return fallback;
  const d = p.date;
  const base = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return seconds ? `${base}:${pad(d.getSeconds())}` : base;
}

/**
 * Format as `dd/mm/yyyy HH:mm[:ss]` (24-hour). Date-only input returns just the
 * date (no time). Invalid/empty input yields `fallback`.
 */
export function formatDateTime(
  input: DateInput,
  {
    seconds = true,
    fallback = "—",
  }: { seconds?: boolean; fallback?: string } = {},
): string {
  const p = toCalendarParts(input);
  if (!p) return fallback;
  const datePart = formatDate(input, fallback);
  if (!p.date) return datePart;
  return `${datePart} ${formatTime(input, { seconds })}`;
}
