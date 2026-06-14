import { formatDate, formatTime, type DateInput } from "@/lib/dateFormat";

/**
 * Two-line date display: the calendar date on top, the 24-hour time below in a
 * smaller, lighter (secondary) style. Used by data-grid date cells and audit
 * tables. Invalid/empty input renders "—".
 */
export default function StackedDateTime({ value }: { value: DateInput }) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return <span className="text-gray-800 dark:text-gray-200">—</span>;
  }
  return (
    <div className="flex h-full w-full min-w-0 flex-col justify-center leading-tight">
      <span className="block truncate text-gray-800 dark:text-gray-200">
        {formatDate(d)}
      </span>
      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
        {formatTime(d)}
      </span>
    </div>
  );
}
