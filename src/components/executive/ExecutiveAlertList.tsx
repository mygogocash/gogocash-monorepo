"use client";

import type { ExecutiveAlert } from "@/data/executive/types";
import { formatDateTime } from "@/lib/dateFormat";
import React from "react";

const severityStyles = {
  critical:
    "border-l-red-500 bg-red-50/80 dark:border-l-red-400 dark:bg-red-950/30",
  warning:
    "border-l-amber-500 bg-amber-50/80 dark:border-l-amber-400 dark:bg-amber-950/25",
  info: "border-l-gray-400 bg-gray-50/80 dark:border-l-gray-500 dark:bg-gray-900/50",
};

type Props = {
  alerts: ExecutiveAlert[];
  title?: string;
};

export function ExecutiveAlertList({
  alerts,
  title = "Risks & anomalies",
}: Props) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Prioritized for leadership review
      </p>
      <ul className="mt-3 space-y-2">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`rounded-r-lg border-l-4 py-2.5 pr-2 pl-3 ${severityStyles[a.severity]}`}
          >
            <p className="text-xs font-semibold tracking-wide text-gray-800 uppercase dark:text-gray-100">
              {a.severity}
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
              {a.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
              {a.detail}
            </p>
            <p className="mt-1.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
              {formatDateTime(a.timestamp)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
