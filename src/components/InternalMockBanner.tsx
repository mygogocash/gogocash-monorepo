"use client";

/**
 * Always-visible banner for internal-only deployment.
 * All data in this app is mock — for internal use only.
 */
export default function InternalMockBanner() {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[9999] pointer-events-none bg-amber-500 text-center py-1.5 text-xs font-bold tracking-wider uppercase text-gray-900 dark:bg-amber-600 dark:text-amber-50"
      role="status"
      aria-label="Internal use only, mock data"
    >
      Internal use only — All data is mock
    </div>
  );
}
