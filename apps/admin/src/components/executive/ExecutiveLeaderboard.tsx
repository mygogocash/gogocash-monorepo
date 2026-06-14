"use client";

import type { LeaderboardRow } from "@/data/executive/types";
import React from "react";

type Props = {
  title: string;
  rows: LeaderboardRow[];
  primaryHeader: string;
  secondaryHeader?: string;
};

export function ExecutiveLeaderboard({ title, rows, primaryHeader, secondaryHeader }: Props) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map((r) => (
          <li key={r.rank} className="flex items-center gap-3 py-2.5 first:pt-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {r.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
              {r.secondary ? (
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{r.secondary}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                {r.primary}
              </p>
              {secondaryHeader && r.trend ? (
                <p
                  className={`text-[10px] font-medium uppercase ${
                    r.trend === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : r.trend === "down"
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-400"
                  }`}
                >
                  {r.trend}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        {primaryHeader}
        {secondaryHeader ? ` · ${secondaryHeader}` : ""}
      </p>
    </div>
  );
}
