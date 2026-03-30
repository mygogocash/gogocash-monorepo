"use client";

import React, { useEffect, useState } from "react";
import { loadPopupHistory, type PopupHistoryEntry } from "@/lib/appOpenPopupStorage";

export default function PopupHistoryTable() {
  const [entries, setEntries] = useState<PopupHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Cannot use useState initializer: client would read localStorage on hydrate and mismatch SSR ([]).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load browser-only storage after mount
    setEntries(loadPopupHistory());
  }, []);

  const refresh = () => setEntries(loadPopupHistory());

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 py-12 text-center dark:border-gray-600 dark:bg-gray-800/40">
        <p className="text-sm text-gray-600 dark:text-gray-300">No saved configurations yet.</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Each time you save on <strong>Modal popups</strong>, a snapshot is stored here (browser only).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {entries.length} snapshot{entries.length !== 1 ? "s" : ""} — newest first.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
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
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/80">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                      {new Date(e.savedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {e.banners.length} configured
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : e.id)}
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
