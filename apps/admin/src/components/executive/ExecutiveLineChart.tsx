"use client";

import type { TrendPoint } from "@/data/executive/types";
import { useTheme } from "@/context/ThemeContext";
import { useChartLayoutReady } from "@/hooks/useChartLayoutReady";
import React, { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  data: TrendPoint[];
  title: string;
  /** second series uses value2 on each point */
  dual?: boolean;
  valueLabel?: string;
  value2Label?: string;
  formatY?: (n: number) => string;
};

export function ExecutiveLineChart({
  data,
  title,
  dual,
  valueLabel = "Value",
  value2Label = "Series B",
  formatY = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${(n / 1000).toFixed(0)}k`),
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
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: chartPalette.axis }} stroke={chartPalette.axis} />
              <YAxis
                tickFormatter={formatY}
                tick={{ fontSize: 11, fill: chartPalette.axis }}
                width={48}
                stroke={chartPalette.axis}
              />
              <Tooltip
                formatter={(value, name) => [safeFormat(value), typeof name === "string" && name ? name : valueLabel]}
                contentStyle={{
                  borderRadius: 8,
                  border: `1px solid ${chartPalette.tooltipBorder}`,
                  fontSize: 12,
                  backgroundColor: chartPalette.tooltipBg,
                  color: chartPalette.tooltipColor,
                }}
                labelStyle={{ color: chartPalette.tooltipColor }}
              />
              <Line type="monotone" dataKey="value" name={valueLabel} stroke="#465fff" strokeWidth={2} dot={false} />
              {dual ? (
                <Line
                  type="monotone"
                  dataKey="value2"
                  name={value2Label}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
