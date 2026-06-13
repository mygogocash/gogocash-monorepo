import { type InputHTMLAttributes } from "react";

/**
 * Search bar — compact text input whose text matches the SortByDropdown design
 * (text-xs, secondary gray-500). Fixed 36px height, 8px (px-2) gaps on the left
 * and right, and a default 200px width that can flex wider.
 */
export default function SearchBar({
  className = "",
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={`focus:border-brand-300 focus:ring-brand-500/10 h-9 min-w-[200px] rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-500 placeholder:text-gray-400 focus:ring-3 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:placeholder:text-gray-500 ${className}`}
      {...props}
    />
  );
}
