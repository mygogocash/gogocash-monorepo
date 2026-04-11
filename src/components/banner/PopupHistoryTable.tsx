"use client";

import React, { useEffect, useState } from "react";
import {
  loadPopupHistory,
  MOCK_POPUP_HISTORY_ENTRIES,
  type AppOpenPopupStoredBanner,
  type PopupHistoryEntry,
} from "@/lib/appOpenPopupStorage";

function scheduleSummary(b: AppOpenPopupStoredBanner): string {
  const start = (b.startDate ?? "").trim();
  const forever = b.endForever !== false;
  const end = (b.endDate ?? "").trim();
  const startPart = start ? `Starts ${start}` : "Start: not set";
  if (forever) return `${startPart} · End: forever`;
  return end ? `${startPart} · Ends ${end}` : `${startPart} · End: not set`;
}

export default function PopupHistoryTable() {
  const [liveEntries, setLiveEntries] = useState<PopupHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Cannot use useState initializer: client would read localStorage on hydrate and mismatch SSR ([]).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load browser-only storage after mount
    setLiveEntries(loadPopupHistory());
  }, []);

  const refresh = () => setLiveEntries(loadPopupHistory());

  const showingMock = liveEntries.length === 0;
  const entries: PopupHistoryEntry[] = showingMock ? MOCK_POPUP_HISTORY_ENTRIES : liveEntries;

  return (
    <div className="space-y-3">
      {showingMock && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Example snapshots</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            No saves in this browser yet—the table below shows sample history so you can preview the layout. Go to{" "}
            <strong>Modal popups</strong> and click <strong>Save configuration</strong> to store real snapshots here
            (browser only).
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {showingMock ? (
            <>
              {entries.length} example snapshot{entries.length !== 1 ? "s" : ""} — newest first
            </>
          ) : (
            <>
              {entries.length} snapshot{entries.length !== 1 ? "s" : ""} — newest first
            </>
          )}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Refresh
        </button>
      </div>
      <div
        className={`overflow-x-auto rounded-xl border dark:border-gray-700 ${
          showingMock ? "border-dashed border-gray-300 dark:border-gray-600" : "border-gray-200"
        }`}
      >
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Saved at
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Popups
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {entries.map((e) => {
              const open = expanded === e.id;
              return (
                <React.Fragment key={e.id}>
                  <tr
                    title={open ? "Click row to hide details" : "Click row to show link details"}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80"
                    onClick={() => setExpanded(open ? null : e.id)}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {new Date(e.savedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {e.banners.length} configured
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setExpanded(open ? null : e.id);
                        }}
                        className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {open ? "Hide" : "View links"}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={3} className="px-4 py-3">
                        <ul className="space-y-2 text-sm">
                          {e.banners.map((b, i) => (
                            <li
                              key={`${e.id}-${b.id}`}
                              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-900"
                            >
                              <span className="font-medium text-gray-800 dark:text-gray-100">Popup {i + 1}</span>
                              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({b.duration})</span>
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{scheduleSummary(b)}</p>
                              <div className="mt-1 break-all text-brand-600 dark:text-brand-400">
                                {b.link ? (
                                  <a href={b.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {b.link}
                                  </a>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">No redirect link</span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
