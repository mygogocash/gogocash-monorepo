"use client";

import { isAdminApiConfigured } from "@/lib/adminApiMode";

/**
 * Always-visible banner for internal-only deployment.
 * Hidden when NEXT_PUBLIC_API_URL is set (real API mode — not all mock).
 */
export default function InternalMockBanner() {
  // Hide banner when pointing at a real API.
  if (isAdminApiConfigured(process.env.NEXT_PUBLIC_API_URL)) return null;
  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-[9999] bg-amber-500 py-1.5 text-center text-xs font-bold tracking-wider text-gray-900 uppercase dark:bg-amber-600 dark:text-amber-50"
      role="status"
      aria-label="Internal use only, mock data"
    >
      Internal use only — All data is mock
    </div>
  );
}
