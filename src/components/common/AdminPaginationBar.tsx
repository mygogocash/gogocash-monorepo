"use client";

import Button from "@/components/ui/button/Button";

type Props = {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
};

export function AdminPaginationBar({ page, totalPages, onPageChange, total }: Props) {
  const lastPage = Math.max(1, totalPages);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{" "}
        <span className="font-medium text-gray-900 dark:text-white">{lastPage}</span>
        <span className="ml-2 text-gray-500">({total} total)</span>
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
