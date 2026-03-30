"use client";

import type { RevenueWaterfallStep } from "@/data/executive/types";
import React from "react";

type Props = {
  steps: RevenueWaterfallStep[];
  title: string;
};

export function ExecutiveWaterfallTable({ steps, title }: Props) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ul className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const color =
            s.type === "negative"
              ? "text-red-600 dark:text-red-400"
              : s.type === "positive"
                ? "text-emerald-600 dark:text-emerald-400"
                : s.type === "end"
                  ? "font-semibold text-gray-950 dark:text-white"
                  : "text-gray-800 dark:text-gray-200";
          const sign = s.value < 0 ? "" : s.type === "positive" ? "+" : "";
          return (
            <li
              key={i}
              className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0 dark:border-gray-800"
            >
              <span className="text-gray-600 dark:text-gray-300">{s.label}</span>
              <span className={`font-mono tabular-nums ${color}`}>
                {sign}
                {s.type === "start" || s.type === "end" || s.type === "positive"
                  ? `$${Math.abs(s.value).toLocaleString()}`
                  : s.value < 0
                    ? `-$${Math.abs(s.value).toLocaleString()}`
                    : `$${s.value.toLocaleString()}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
