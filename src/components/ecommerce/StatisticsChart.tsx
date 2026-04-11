"use client";
import React, { useMemo, useState } from "react";
import { ApexOptions } from "apexcharts";
import { useQuery } from "@tanstack/react-query";
import ChartTab, { type ChartTabId } from "../common/ChartTab";
import dynamic from "next/dynamic";
import {
  DASHBOARD_INSIGHTS_QUERY_KEY,
  fetchDashboardInsights,
} from "@/lib/query/dashboardQueries";
import {
  getSummaryTotalsFromBundle,
  STATISTICS_MOCK_BY_TAB,
} from "./statisticsChartMockData";
import {
  STATISTICS_CHART_HEIGHT,
  STATISTICS_SERIES_COLORS,
  STATISTICS_SUMMARY_CARD_ACCENTS,
} from "@/constants/statisticsChartTheme";
import { useHtmlDarkClass } from "@/hooks/useHtmlDarkClass";
import type { DashboardInsightRange } from "@/types/api";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center rounded-lg bg-gray-50 transition-opacity duration-300 dark:bg-gray-800/50"
      style={{ height: STATISTICS_CHART_HEIGHT }}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart…</p>
    </div>
  ),
});

function formatThb(value: number): string {
  return `฿${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

type ChartKind = "column" | "line";

const CHART_KIND_LABELS: Record<ChartKind, string> = {
  column: "Column",
  line: "Line",
};

export type StatisticsChartProps = {
  insightRange?: DashboardInsightRange;
};

export default function StatisticsChart({ insightRange = "30d" }: StatisticsChartProps = {}) {
  const [timeRange, setTimeRange] = useState<ChartTabId>("month");
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const isDarkChart = useHtmlDarkClass();

  const { data: insights } = useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, insightRange],
    queryFn: () => fetchDashboardInsights(insightRange),
    staleTime: 60_000,
  });

  const bundle = useMemo(() => {
    const fromApi = insights?.statistics?.[timeRange];
    return fromApi ?? STATISTICS_MOCK_BY_TAB[timeRange];
  }, [insights?.statistics, timeRange]);

  const summaryTotals = useMemo(() => getSummaryTotalsFromBundle(bundle), [bundle]);

  const summaryCards = useMemo(
    () =>
      [
        {
          label: "Clicks",
          value: summaryTotals.clicks.toLocaleString("en-US"),
          accent: STATISTICS_SUMMARY_CARD_ACCENTS[0],
        },
        {
          label: "Conversions",
          value: summaryTotals.conversions.toLocaleString("en-US"),
          accent: STATISTICS_SUMMARY_CARD_ACCENTS[1],
        },
        {
          label: "Sale amount",
          value: formatThb(summaryTotals.saleAmount),
          accent: STATISTICS_SUMMARY_CARD_ACCENTS[2],
        },
        {
          label: "Estimated earnings",
          value: formatThb(summaryTotals.estimatedEarnings),
          accent: STATISTICS_SUMMARY_CARD_ACCENTS[3],
        },
      ] as const,
    [summaryTotals],
  );

  const isBar = chartKind === "column";

  const options: ApexOptions = useMemo(() => {
    const tab = bundle;
    const seriesColors = [...STATISTICS_SERIES_COLORS];
    const legendLabelColor = isDarkChart ? "#D1D5DB" : "#374151";
    const axisMuted = isDarkChart ? "#9CA3AF" : "#4B5563";
    const gridColor = isDarkChart ? "#374151" : "#E5E7EB";

    /** Line strokes use Fill.fillPath() in ApexCharts; gradient fill becomes the stroke paint and reads nearly invisible. */
    const lineStroke = {
      curve: "smooth" as const,
      width: [3, 3, 3, 3],
      lineCap: "round" as const,
      colors: seriesColors,
    };
    return {
      theme: {
        mode: isDarkChart ? "dark" : "light",
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit, sans-serif",
        fontSize: "12px",
        labels: {
          colors: legendLabelColor,
        },
        markers: {
          size: 5,
          shape: "square" as const,
          strokeWidth: 0,
          radius: 1,
        },
      },
      colors: seriesColors,
      chart: {
        fontFamily: "Outfit, sans-serif",
        height: STATISTICS_CHART_HEIGHT,
        type: isBar ? "bar" : "line",
        stacked: false,
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 450,
        },
        background: "transparent",
      },
      ...(isBar
        ? {
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: "52%",
                borderRadius: 10,
                borderRadiusApplication: "around",
              },
            },
            stroke: { width: 0 },
          }
        : {
            plotOptions: {
              line: {
                isSlopeChart: false,
              },
            },
            stroke: lineStroke,
          }),
      fill: { type: "solid", opacity: 1 },
      markers: isBar
        ? { size: 0 }
        : {
            size: 0,
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: { size: 6 },
          },
      grid: {
        borderColor: gridColor,
        strokeDashArray: 4,
        padding: {
          right: 12,
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        theme: isDarkChart ? "dark" : "light",
        x: {
          formatter: (_val: unknown, opts?: { dataPointIndex?: number }) => {
            const i = opts?.dataPointIndex ?? 0;
            return tab.categories[i] ?? "";
          },
        },
        y: {
          formatter: (val: number, opts: { seriesIndex?: number }) => {
            const idx = opts.seriesIndex ?? 0;
            if (idx === 2 || idx === 3) {
              return formatThb(val);
            }
            return Number(val).toLocaleString("en-US");
          },
        },
      },
      xaxis: {
        type: "category",
        categories: [...tab.categories],
        labels: {
          rotate: tab.categories.length > 12 ? -45 : 0,
          rotateAlways: tab.categories.length > 12,
          hideOverlappingLabels: true,
          style: {
            fontSize: "11px",
            colors: axisMuted,
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: [
        {
          seriesName: "Clicks",
          title: {
            text: "Clicks / conversions",
            style: { fontSize: "11px", color: isDarkChart ? "#9CA3AF" : "#6B7280" },
          },
          labels: {
            style: {
              fontSize: "12px",
              colors: [isDarkChart ? "#9CA3AF" : "#6B7280"],
            },
            formatter: (v: number) => Number(v).toLocaleString("en-US"),
          },
        },
        {
          seriesName: "Conversions",
          show: false,
        },
        {
          seriesName: "Sale Amount",
          opposite: true,
          title: {
            text: "Sale & earnings (THB)",
            style: { fontSize: "11px", color: isDarkChart ? "#9CA3AF" : "#6B7280" },
          },
          labels: {
            style: {
              fontSize: "12px",
              colors: [isDarkChart ? "#9CA3AF" : "#6B7280"],
            },
            formatter: (v: number) => formatThb(v),
          },
        },
        {
          seriesName: "Estimated Earnings",
          show: false,
        },
      ],
    };
  }, [isBar, isDarkChart, bundle]);

  const series = useMemo(() => bundle.series, [bundle]);
  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 transition-shadow duration-300 ease-out dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="mb-6 flex min-w-0 flex-col gap-5 sm:flex-row sm:justify-between">
        <div className="min-w-0 w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 break-words text-gray-500 text-theme-sm dark:text-gray-400">
            Clicks, conversions, sale amount & estimated earnings
            <span className="ml-1 text-gray-400 dark:text-gray-500">
              — {bundle.description}
              {insights?.statistics?.[timeRange] ? " (from conversion data)" : ""}
            </span>
          </p>
        </div>
        <div className="flex w-full min-w-0 items-start gap-3 sm:shrink-0 sm:justify-end">
          <ChartTab value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div
        className="mb-6 flex flex-col gap-4"
        role="region"
        aria-label="Statistics summary"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Summary
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border border-gray-100 border-l-4 p-4 transition-all duration-200 ease-out hover:shadow-sm dark:border-gray-800 ${card.accent}`}
            >
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Chart type
        </p>
        <div
          className="flex w-full flex-wrap items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 sm:w-auto dark:bg-gray-900"
          role="group"
          aria-label="Statistics chart type"
        >
          {(["column", "line"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={chartKind === key}
              onClick={() => setChartKind(key)}
              className={`rounded-md px-2.5 py-2 text-left text-theme-sm font-medium transition-all duration-200 ease-out active:scale-[0.97] sm:px-3 ${
                chartKind === key
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {CHART_KIND_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain custom-scrollbar">
        <div
          className={
            timeRange === "day"
              ? "min-w-[1400px] xl:min-w-full"
              : "min-w-[1000px] xl:min-w-full"
          }
        >
          <div className="rounded-xl bg-slate-50/90 p-2 ring-1 ring-slate-200/80 dark:bg-gray-900/40 dark:ring-gray-700/80">
            <ReactApexChart
              key={`${chartKind}-${timeRange}-${isBar ? "bar" : "line"}`}
              options={options}
              series={series}
              type={isBar ? "bar" : "line"}
              height={STATISTICS_CHART_HEIGHT}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
