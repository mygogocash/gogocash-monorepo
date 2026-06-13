"use client";

import { useTheme } from "@/context/ThemeContext";
import { useChartLayoutReady } from "@/hooks/useChartLayoutReady";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, string | number>;

type Props = {
  data: Row[];
  dataKey: string;
  xKey: string;
  title: string;
  formatY?: (n: number) => string;
  color?: string;
};

export function ExecutiveBarChart({
  data,
  dataKey,
  xKey,
  title,
  formatY = (n) => `${(n / 1000).toFixed(0)}k`,
  color = "#465fff",
}: Props) {
  const chartReady = useChartLayoutReady();
  const { theme: appTheme } = useTheme();
  const isDark = appTheme === "dark";

  const chartPalette = useMemo(() => {
    if (isDark) {
      return {
        grid: "#374151",
        axis: "#9ca3af",
        tooltipBg: "#1d2939",
        tooltipBorder: "#374151",
        tooltipColor: "#f3f4f6",
      };
    }
    return {
      grid: "#e5e7eb",
      axis: "#9ca3af",
      tooltipBg: "#ffffff",
      tooltipBorder: "#e5e7eb",
      tooltipColor: "#111827",
    };
  }, [isDark]);

  const safeFormat = (raw: unknown) => {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? formatY(n) : "—";
  };

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="mt-4 h-56 w-full min-w-[200px]">
        {!chartReady ? (
          <div
            className="flex h-full w-full items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400 dark:bg-gray-800/80 dark:text-gray-500"
            aria-hidden
          >
            Loading chart…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: chartPalette.axis }}
                interval={0}
                angle={-12}
                textAnchor="end"
                height={48}
                stroke={chartPalette.axis}
              />
              <YAxis
                tickFormatter={formatY}
                tick={{ fontSize: 11, fill: chartPalette.axis }}
                width={44}
                stroke={chartPalette.axis}
              />
              <Tooltip
                formatter={(v) => [safeFormat(v), dataKey]}
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 12,
                  backgroundColor: chartPalette.tooltipBg,
                  border: `1px solid ${chartPalette.tooltipBorder}`,
                  color: chartPalette.tooltipColor,
                }}
                labelStyle={{ color: chartPalette.tooltipColor }}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
