"use client";

import { useState } from "react";
import type {
  DashboardInsightRange,
  DashboardInsightRangeValue,
} from "@/types/api";
import {
  customRangeToken,
  parseCustomRange,
  parseIsoDateLocal,
  presetRangeDates,
} from "@/lib/insightRange";

const OPTIONS: { value: DashboardInsightRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

function formatCustomLabel(from: string, to: string): string {
  const f = parseIsoDateLocal(from);
  const t = parseIsoDateLocal(to);
  if (!f || !t) return "Custom range";
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(f)} – ${fmt(t)}`;
}

/** Full, human-readable label for a range (used for the KPI window line). */
export function insightRangeLabel(range: DashboardInsightRangeValue): string {
  const custom = parseCustomRange(range);
  if (custom) return formatCustomLabel(custom.from, custom.to);
  switch (range) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
    default:
      return "Last 30 days";
  }
}

/** Compact label for inline chips (e.g. "Conversions (30d)"). */
export function insightRangeShortLabel(
  range: DashboardInsightRangeValue,
): string {
  if (parseCustomRange(range)) return "Custom";
  switch (range) {
    case "7d":
      return "7d";
    case "30d":
      return "30d";
    case "90d":
      return "90d";
    case "all":
      return "All";
    default:
      return "30d";
  }
}

const buttonClass = (active: boolean): string =>
  `min-h-10 rounded-md px-2 py-2 text-center text-xs font-medium transition-all duration-200 ease-out active:scale-[0.97] sm:min-h-0 sm:px-3 sm:text-left sm:text-theme-sm ${
    active
      ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
  }`;

const dateInputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:[color-scheme:dark] sm:w-40";

type Props = {
  value: DashboardInsightRangeValue;
  onChange: (value: DashboardInsightRangeValue) => void;
};

export function DashboardInsightRangeControl({ value, onChange }: Props) {
  const custom = parseCustomRange(value);
  const [prevValue, setPrevValue] = useState(value);
  const [from, setFrom] = useState<string>(
    () => presetRangeDates(value, new Date()).from,
  );
  const [to, setTo] = useState<string>(
    () => presetRangeDates(value, new Date()).to,
  );

  // Sync the From/To inputs when the selection changes. Adjusting state during
  // render is React's recommended alternative to a setState-in-effect: clicking
  // a preset fills the inputs with that window; a custom range shows its own.
  if (value !== prevValue) {
    setPrevValue(value);
    const next = presetRangeDates(value, new Date());
    setFrom(next.from);
    setTo(next.to);
  }

  // Editing a date switches to a custom range — but only once both ends are
  // valid and in order, so half-typed input doesn't refetch on every keystroke.
  function emitIfValid(nextFrom: string, nextTo: string) {
    const f = parseIsoDateLocal(nextFrom);
    const t = parseIsoDateLocal(nextTo);
    if (f && t && f.getTime() <= t.getTime()) {
      onChange(customRangeToken(nextFrom, nextTo));
    }
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-4"
      role="group"
      aria-label="Insight time range"
    >
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <span className="shrink-0 text-sm font-semibold tracking-wide text-gray-700 uppercase sm:text-base dark:text-gray-200">
          Range
        </span>
        <div
          className="grid w-full min-w-0 grid-cols-4 gap-0.5 rounded-lg bg-gray-100 p-0.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-start dark:bg-gray-900"
          role="presentation"
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={!custom && value === opt.value}
              onClick={() => onChange(opt.value)}
              className={buttonClass(!custom && value === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-end sm:gap-3">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            From
          </span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              emitIfValid(e.target.value, to);
            }}
            className={dateInputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            To
          </span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              emitIfValid(from, e.target.value);
            }}
            className={dateInputClass}
          />
        </label>
      </div>
    </div>
  );
}
