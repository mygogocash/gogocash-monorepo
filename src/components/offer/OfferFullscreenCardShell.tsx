"use client";

import type { ReactNode } from "react";

/**
 * Shared bordered card + min-height stack for offer edit (fullscreen modal) and
 * pending review page so layout and scroll behavior stay aligned.
 */
export function OfferFullscreenCardShell({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex min-h-[calc(100dvh-14rem)] min-w-0 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8">
            {header}
            <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
