"use client";

/**
 * Always-visible banner for internal-only deployment.
 * Hidden when NEXT_PUBLIC_API_URL is set (real API mode — not all mock).
 */
export default function InternalMockBanner() {
  // Hide banner when pointing at a real API.
  if (process.env.NEXT_PUBLIC_API_URL) return null;
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
