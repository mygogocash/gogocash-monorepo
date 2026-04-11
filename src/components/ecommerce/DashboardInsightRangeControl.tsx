"use client";

import type { DashboardInsightRange } from "@/types/api";

const OPTIONS: { value: DashboardInsightRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function insightRangeLabel(range: DashboardInsightRange): string {
  switch (range) {
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    case "all":
      return "All time";
    default: {
      const _x: never = range;
      return _x;
    }
  }
}

type Props = {
  value: DashboardInsightRange;
  onChange: (value: DashboardInsightRange) => void;
};

export function DashboardInsightRangeControl({ value, onChange }: Props) {
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
      role="group"
      aria-label="Insight time range"
    >
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Range
      </span>
      <div
        className="grid w-full min-w-0 grid-cols-4 gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900 sm:flex sm:w-auto sm:flex-wrap sm:justify-start"
        role="presentation"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`min-h-10 rounded-md px-2 py-2 text-center text-xs font-medium transition-all duration-200 ease-out active:scale-[0.97] sm:min-h-0 sm:px-3 sm:text-left sm:text-theme-sm ${
              value === opt.value
                ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
