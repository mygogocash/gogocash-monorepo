"use client";

import type { KpiTarget, RoadmapMilestone } from "@/data/executive/types";
import React from "react";

type Props = {
  milestones: RoadmapMilestone[];
  targets: KpiTarget[];
};

function statusBadge(status: RoadmapMilestone["status"]) {
  if (status === "complete") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (status === "in_progress")
    return "bg-brand-500/15 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
}

export function ExecutiveRoadmap({ milestones, targets }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Operating plan milestones</h3>
        <ul className="mt-4 space-y-4">
          {milestones.map((m) => (
            <li key={m.id} className="border-b border-gray-100 pb-4 last:border-0 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-gray-900 px-2 py-0.5 font-mono text-xs font-bold text-white dark:bg-gray-100 dark:text-gray-900">
                  {m.code}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(m.status)}`}>
                  {m.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{m.window}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{m.title}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600"
                  style={{ width: `${m.progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-gray-500">{m.progressPct}% complete</p>
              <ul className="mt-2 list-inside list-disc text-xs text-gray-600 dark:text-gray-300">
                {m.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Strategic KPI targets</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Board trackers: 1M users · 100k transactions · 50 merchants
        </p>
        <ul className="mt-4 space-y-4">
          {targets.map((t) => {
            const pct = Math.min(150, Math.round((t.current / t.target) * 100));
            const over = t.current >= t.target;
            return (
              <li key={t.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800 dark:text-gray-200">{t.label}</span>
                  <span className="font-mono text-xs tabular-nums text-gray-600 dark:text-gray-300">
                    {t.unit === "usd"
                      ? `${t.current.toLocaleString()} USD`
                      : t.current.toLocaleString()}
                    {" / "}
                    {t.unit === "usd"
                      ? `${t.target.toLocaleString()} USD`
                      : t.target.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full ${over ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className={`mt-1 text-right text-[10px] font-medium ${over ? "text-emerald-600" : "text-amber-600"}`}>
                  {pct}% of target {over ? "· on track" : "· gap to close"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
