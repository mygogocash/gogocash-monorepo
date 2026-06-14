"use client";

import { getKpiDefinition } from "@/data/executive/kpiDefinitions";
import React from "react";

type StatusTone = "positive" | "warning" | "negative" | "neutral";

export type ExecutiveKpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  deltaLabel?: string;
  /** Semantic performance tone for border/accent */
  tone?: StatusTone;
  /** Maps to kpiDefinitions.ts for tooltip context */
  kpiId?: string;
};

const toneRing: Record<StatusTone, string> = {
  positive: "ring-emerald-500/25 dark:ring-emerald-400/20",
  warning: "ring-amber-500/30 dark:ring-amber-400/25",
  negative: "ring-red-500/25 dark:ring-red-400/20",
  neutral: "ring-gray-200/80 dark:ring-gray-700/80",
};

export function ExecutiveKpiCard({
  label,
  value,
  sublabel,
  deltaLabel,
  tone = "neutral",
  kpiId,
}: ExecutiveKpiCardProps) {
  const def = kpiId ? getKpiDefinition(kpiId) : undefined;
  const title = def
    ? `${def.name}\n\nWhy: ${def.whyItMatters}\n\nFormula: ${def.formula}\nSource: ${def.sourceTable} · ${def.updateFrequency}`
    : undefined;

  return (
    <div
      className={`rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm ring-1 ring-inset dark:border-gray-800 dark:bg-gray-900/60 ${toneRing[tone]}`}
      title={title}
    >
      <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>
      ) : null}
      {deltaLabel ? (
        <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">{deltaLabel}</p>
      ) : null}
    </div>
  );
}
