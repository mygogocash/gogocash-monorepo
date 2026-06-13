import { type SelectHTMLAttributes } from "react";

/**
 * Sort-by dropdown — compact select with text-xs in the secondary (gray-500)
 * text color, a fixed 36px height, and 8px (px-2) gaps on the left and right.
 * Default width is 124px and grows to fit a longer selected title.
 */
export default function SortByDropdown({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-9 min-w-[124px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 ${className}`}
      {...props}
    />
  );
}
