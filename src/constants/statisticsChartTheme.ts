/** Height (px) for Statistics chart and its loading skeleton — keep in sync. */
export const STATISTICS_CHART_HEIGHT = 310;

/** Series order: Clicks, Conversions, Sale amount, Estimated earnings */
export const STATISTICS_SERIES_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#93C5FD",
] as const;

/** Tailwind accent classes for summary cards (same order as `STATISTICS_SERIES_COLORS`). */
export const STATISTICS_SUMMARY_CARD_ACCENTS = [
  "border-l-[#3B82F6] bg-[#3B82F6]/[0.06] dark:bg-[#3B82F6]/10",
  "border-l-[#10B981] bg-[#10B981]/[0.06] dark:bg-[#10B981]/10",
  "border-l-[#F59E0B] bg-[#F59E0B]/[0.06] dark:bg-[#F59E0B]/10",
  "border-l-[#93C5FD] bg-[#93C5FD]/[0.18] dark:bg-[#93C5FD]/15",
] as const;
