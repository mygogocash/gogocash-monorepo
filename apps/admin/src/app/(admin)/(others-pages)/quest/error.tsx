"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for the Quest admin (list + [questId]/edit).
 *
 * The admin previously had NO error boundaries, so any render error on the quest
 * pages surfaced as a raw "Internal Server Error" with no context or recovery.
 * This catches the error, logs it (so the real stack reaches the console /
 * monitoring), shows the Next.js `digest` (which correlates to the server log so
 * the underlying cause can be pinned), and offers Retry + Back to Quest.
 */
export default function QuestRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[quest route error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Something went wrong loading this quest
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This page hit an unexpected error. Try again, or head back to the quest list.
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-xs text-gray-400 dark:text-gray-500">
            Ref: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Try again
          </button>
          <Link
            href="/quest"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.05]"
          >
            Back to Quest
          </Link>
        </div>
      </div>
    </div>
  );
}
