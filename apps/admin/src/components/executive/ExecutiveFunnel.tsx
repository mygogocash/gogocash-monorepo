"use client";

import type { FunnelStage } from "@/data/executive/types";
import React from "react";

type Props = {
  stages: FunnelStage[];
  title: string;
};

export function ExecutiveFunnel({ stages, title }: Props) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {stages.map((s) => {
          const w = Math.max(8, (s.count / max) * 100);
          return (
            <li key={s.id}>
              <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-800 dark:text-gray-200">{s.label}</span>
                <span className="tabular-nums">
                  {s.count.toLocaleString()}
                  {s.rateFromPrev != null ? (
                    <span className="ml-2 text-gray-400">({s.rateFromPrev.toFixed(1)}% prev)</span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                  style={{ width: `${w}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
