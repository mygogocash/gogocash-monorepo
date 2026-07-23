"use client";

import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/axios/client";
import { BANNER_ADMIN_SURFACE_ORDER, BANNER_ADMIN_SURFACES } from "@/lib/bannerAdminSurfaces";
import { getBannerSlotDescriptors } from "@/lib/bannerSlotDescriptors";
import { listInactiveBannerSlots, type InactiveBannerSlotReason } from "@/lib/bannerSlotStatus";
import type { BannerData } from "@/types/banner";
import Link from "next/link";

function inactiveReasonLabel(reason: InactiveBannerSlotReason): string {
  switch (reason) {
    case "Empty":
      return "Empty slot";
    case "Needs image":
      return "Needs image";
    case "Disabled":
      return "Disabled";
    case "Ended":
      return "Ended";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export default function BannerInactiveSlotsSection() {
  const router = useRouter();
  const results = useQueries({
    queries: BANNER_ADMIN_SURFACE_ORDER.map((surfaceId) => {
      const s = BANNER_ADMIN_SURFACES[surfaceId];
      return {
        queryKey: s.queryKey,
        queryFn: () => fetcher(s.fetchPath) as Promise<BannerData>,
      };
    }),
  });

  return (
    <div className="space-y-8">
      {BANNER_ADMIN_SURFACE_ORDER.map((surfaceId, i) => {
        const surface = BANNER_ADMIN_SURFACES[surfaceId];
        const q = results[i];
        const slotDescriptors = getBannerSlotDescriptors(surfaceId);
        const managedSlots = new Set<number>(
          slotDescriptors.map(({ slot }) => slot),
        );
        const inactive = listInactiveBannerSlots(q.data).filter(({ slot }) =>
          managedSlots.has(slot),
        );

        return (
          <section key={surfaceId} aria-labelledby={`inactive-banner-${surfaceId}-title`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h4 id={`inactive-banner-${surfaceId}-title`} className="text-sm font-semibold text-gray-900 dark:text-white">
                {surface.listTitle}
              </h4>
              <Link
                href={surface.editHref}
                className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Edit on banner page
              </Link>
            </div>
            {q.isLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : q.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                Could not load banner data.
              </p>
            ) : inactive.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No inactive slots (empty, incomplete, disabled, or past end date).</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <caption className="sr-only">
                    Inactive slots for {surface.listTitle}
                  </caption>
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Placement
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Link
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Image
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                    {inactive.map((row) => (
                      <tr
                        key={row.slot}
                        title="Open banner admin for this surface"
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80"
                        onClick={() => router.push(surface.editHref)}
                      >
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {slotDescriptors.find(({ slot }) => slot === row.slot)?.label ?? row.slot}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            Inactive · {inactiveReasonLabel(row.reason)}
                          </span>
                        </td>
                        <td className="max-w-xs px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(ev) => ev.stopPropagation()}
                              className="break-all text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {row.link}
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {row.hasImageId ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
