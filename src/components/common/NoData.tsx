import type { ReactNode } from "react";

type Props = {
  /** Headline text; defaults to "No Data". */
  title?: ReactNode;
  /** Optional contextual subtext shown beneath the headline. */
  children?: ReactNode;
  /** Extra classes appended to the outer dashed box. */
  className?: string;
};

/**
 * Standard empty-state placeholder: a dashed box with a "No Data" headline and
 * optional contextual subtext. Shared by every section and table that can
 * render with no records so empty states look identical across the admin.
 */
export default function NoData({
  title = "No Data",
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50 ${className}`}
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
        {title}
      </p>
      {children ? (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {children}
        </div>
      ) : null}
    </div>
  );
}
