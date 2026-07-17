"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";

import { appLinks } from "@/lib/appLinks";
import { fetcher } from "@/lib/axios/client";
import {
  SPECIFIC_PAGE_BANNER_TARGET_IDS,
  SPECIFIC_PAGE_BANNER_TARGETS,
  specificPageBannerTargetFromParam,
} from "@/lib/bannerAdminSurfaces";
import {
  getBannerSlotRowFields,
  getBannerSlotStatus,
} from "@/lib/bannerSlotStatus";
import type { BannerData, BannerSlotDescriptor } from "@/types/banner";

import BannerTable from "./BannerTable";

function summarizeTarget(
  data: BannerData | undefined,
  slots: readonly BannerSlotDescriptor[],
): { configured: number; live: number; scheduled: number } {
  return slots.reduce(
    (summary, { slot }) => {
      const row = getBannerSlotRowFields(data, slot);
      const status = getBannerSlotStatus({
        hasSlotContent: row.hasSlotContent,
        hasImage: row.hasImage,
        enabled: row.enabled,
        start_date: row.startDate,
        end_date: row.endDate,
      }).status;
      if (row.hasImage) summary.configured += 1;
      if (status === "Active") summary.live += 1;
      if (status === "Scheduled") summary.scheduled += 1;
      return summary;
    },
    { configured: 0, live: 0, scheduled: 0 },
  );
}

export default function SpecificPageBannerManager() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTargetId = specificPageBannerTargetFromParam(
    searchParams.get("target"),
  );
  const selectedTarget = SPECIFIC_PAGE_BANNER_TARGETS[selectedTargetId];

  const targetQueries = useQueries({
    queries: SPECIFIC_PAGE_BANNER_TARGET_IDS.map((id) => {
      const target = SPECIFIC_PAGE_BANNER_TARGETS[id];
      return {
        queryKey: target.queryKey,
        queryFn: () => fetcher(target.fetchPath) as Promise<BannerData>,
      };
    }),
  });

  const summaries = useMemo(
    () =>
      SPECIFIC_PAGE_BANNER_TARGET_IDS.map((id, index) => ({
        id,
        query: targetQueries[index],
        summary: summarizeTarget(
          targetQueries[index]?.data,
          SPECIFIC_PAGE_BANNER_TARGETS[id].slots,
        ),
      })),
    [targetQueries],
  );

  const selectTarget = useCallback(
    (targetId: (typeof SPECIFIC_PAGE_BANNER_TARGET_IDS)[number]) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("target", targetId);
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="space-y-5">
      <section aria-labelledby="page-banner-targets-title">
        <div className="mb-3">
          <h2
            id="page-banner-targets-title"
            className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white"
          >
            Choose a customer page
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Each page has its own three-slide carousel, schedule, and
            destination links.
          </p>
        </div>
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
          role="tablist"
          aria-label="Specific page banner targets"
        >
          {summaries.map(({ id, query, summary }) => {
            const target = SPECIFIC_PAGE_BANNER_TARGETS[id];
            const selected = id === selectedTargetId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="selected-page-banner-panel"
                onClick={() => selectTarget(id)}
                className={`focus:ring-brand-500/15 min-h-28 rounded-2xl border p-4 text-left transition-colors focus:ring-4 focus:outline-none ${
                  selected
                    ? "border-brand-500 bg-brand-50 shadow-theme-xs dark:border-brand-400 dark:bg-brand-500/10"
                    : "hover:border-brand-200 dark:hover:border-brand-500/40 border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    {target.label}
                  </span>
                  {selected ? (
                    <span className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 rounded px-2 py-0.5 text-xs font-medium">
                      Selected
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  Customer route: {target.customerPath}
                </span>
                <span className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                  {query?.isLoading ? (
                    <span>Loading status…</span>
                  ) : query?.isError ? (
                    <span className="text-red-600 dark:text-red-400">
                      Status unavailable
                    </span>
                  ) : (
                    <>
                      <span>{summary.configured}/3 configured</span>
                      <span>{summary.live} live</span>
                      <span>{summary.scheduled} scheduled</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        id="selected-page-banner-panel"
        role="tabpanel"
        className="border-brand-100 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10 rounded-2xl border px-4 py-4 sm:px-6"
        aria-labelledby="selected-page-banner-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-brand-700 dark:text-brand-300 text-xs font-semibold tracking-wide uppercase">
              Selected customer page
            </p>
            <h2
              id="selected-page-banner-title"
              className="mt-1 text-lg font-semibold text-gray-900 dark:text-white"
            >
              {selectedTarget.label}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {selectedTarget.customerPlacement} Slides No. 1–3 display in
              order.
            </p>
          </div>
          <a
            href={appLinks.path(selectedTarget.customerPath)}
            target="_blank"
            rel="noopener noreferrer"
            className="border-brand-500 text-brand-600 hover:bg-brand-50 focus:ring-brand-500/15 dark:text-brand-300 inline-flex min-h-11 items-center justify-center rounded-lg border bg-white px-4 text-sm font-medium focus:ring-4 focus:outline-none dark:bg-gray-900 dark:hover:bg-gray-800"
          >
            View customer page
          </a>
        </div>
      </section>

      <BannerTable surfaceId={selectedTargetId} />
    </div>
  );
}
