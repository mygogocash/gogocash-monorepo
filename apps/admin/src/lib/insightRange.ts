/**
 * Pure helpers for dashboard insight ranges.
 *
 * A range is either a preset (`7d` | `30d` | `90d` | `all`) or a custom window
 * encoded as the string token `custom:<YYYY-MM-DD>:<YYYY-MM-DD>`. Keeping the
 * encode/parse logic here (with no React or mock-data imports) lets both the
 * client range control and the server-side mock builder share one source of
 * truth — and lets it be unit tested in isolation.
 */

import type { DashboardInsightRangeValue } from "@/types/api";

export const CUSTOM_RANGE_PREFIX = "custom";

export type CustomRangeParts = { from: string; to: string };

/**
 * Parses a `YYYY-MM-DD` string into a Date anchored at local noon (avoids the
 * UTC-midnight off-by-one when the runtime is west of UTC). Returns null for
 * malformed or calendar-overflow dates (e.g. `2026-02-31`).
 */
export function parseIsoDateLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  // Reject overflow (JS rolls 2026-02-31 forward to March).
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function isIsoDate(value: string): boolean {
  return parseIsoDateLocal(value) != null;
}

export function customRangeToken(from: string, to: string): string {
  return `${CUSTOM_RANGE_PREFIX}:${from}:${to}`;
}

export function parseCustomRange(
  value: string | null | undefined,
): CustomRangeParts | null {
  if (!value) return null;
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== CUSTOM_RANGE_PREFIX) return null;
  const [, from, to] = parts;
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  return { from, to };
}

export function isCustomRange(value: string | null | undefined): boolean {
  return parseCustomRange(value) != null;
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBefore(now: Date, n: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

const PRESET_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * The From/To calendar dates a range should display. For a preset, To is today
 * and From is N days back ("all" has no lower bound, so From is blank). For a
 * custom token, its own dates are returned (now is ignored).
 */
export function presetRangeDates(
  range: DashboardInsightRangeValue,
  now: Date,
): CustomRangeParts {
  const custom = parseCustomRange(range);
  if (custom) return custom;
  const to = toIsoLocal(now);
  if (range === "all") return { from: "", to };
  const days = PRESET_DAYS[range as "7d" | "30d" | "90d"] ?? 30;
  return { from: toIsoLocal(daysBefore(now, days)), to };
}
