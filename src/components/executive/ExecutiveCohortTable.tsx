"use client";

import type { CohortCell } from "@/data/executive/types";
import React from "react";

function heatClass(pct: number): string {
  if (pct >= 45) return "bg-emerald-600 text-white dark:bg-emerald-500";
  if (pct >= 35) return "bg-emerald-500/80 text-white dark:bg-emerald-600/90";
  if (pct >= 28) return "bg-emerald-400/70 text-gray-900 dark:bg-emerald-700/80 dark:text-white";
  if (pct >= 22) return "bg-amber-400/80 text-gray-900 dark:bg-amber-600/70 dark:text-white";
  return "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
}

type Props = {
  rows: CohortCell[];
  title: string;
};

export function ExecutiveCohortTable({ rows, title }: Props) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Retention % by cohort week</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-center text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="py-2 pr-3 text-left font-medium">Cohort</th>
              <th className="px-1 py-2 font-medium">W0</th>
              <th className="px-1 py-2 font-medium">W1</th>
              <th className="px-1 py-2 font-medium">W2</th>
              <th className="px-1 py-2 font-medium">W3</th>
              <th className="px-1 py-2 font-medium">W4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-3 text-left font-mono font-medium text-gray-800 dark:text-gray-200">
                  {r.period}
                </td>
                {[r.w0, r.w1, r.w2, r.w3, r.w4].map((v, i) => (
                  <td key={i} className="p-1">
                    <span className={`inline-flex min-w-[2.5rem] justify-center rounded-md px-2 py-1 font-mono tabular-nums ${heatClass(v)}`}>
                      {v}%
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
