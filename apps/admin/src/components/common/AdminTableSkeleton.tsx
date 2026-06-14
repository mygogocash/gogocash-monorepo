"use client";

export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}
