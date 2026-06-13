"use client";

import { useEffect, useState } from "react";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";
import { clampPage } from "@/lib/pagination";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
  /**
   * When provided, the summary shows a page-size ("rolls") dropdown. Omit it
   * (the default) to keep the plain "Showing X to Y of Z results" summary.
   */
  onPageSizeChange?: (size: number) => void;
  /** Page-size options for the dropdown; defaults to 5 / 10 / 15 / 20. */
  pageSizeOptions?: number[];
};

/**
 * Standard admin table pagination footer: a "Showing X to Y of Z results"
 * summary plus Previous / jump-to-page / Next controls. Shared by the Users,
 * Membership, Subscription, and Credit-score tables so they look identical.
 */
export function AdminPaginationBar({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 15, 20],
}: Props) {
  const lastPage = Math.max(1, totalPages);
  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  // Editable "jump to page" input, kept in sync with the active page.
  const [pageInput, setPageInput] = useState(String(page));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  // Commit a typed page number: clamp to a valid page and navigate if it changed.
  const commitPageInput = () => {
    const raw = pageInput.trim();
    if (raw === "") {
      setPageInput(String(page));
      return;
    }
    const target = clampPage(Number(raw), lastPage);
    if (target !== page) onPageChange(target);
    else setPageInput(String(page));
  };

  return (
    <div className="mt-6 flex items-center justify-between">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {onPageSizeChange ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            Showing
            <select
              value={limit}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="rounded border border-gray-300 px-1.5 py-1 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            rolls · {rangeStart} to {rangeEnd} of {total} results
          </span>
        ) : (
          <>
            Showing {rangeStart} to {rangeEnd} of {total} results
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Previous
        </button>
        <span className="flex items-center gap-1.5 px-1 text-sm text-gray-600 dark:text-gray-400">
          Page
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitPageInput();
              }
            }}
            onBlur={commitPageInput}
            aria-label="Jump to page"
            className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300"
          />
          of {lastPage}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
          className={`${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
