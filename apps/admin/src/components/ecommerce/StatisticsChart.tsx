"use client";
import React, { useMemo, useState } from "react";
import { formatMoney } from "@/lib/currencyFormat";
import { ApexOptions } from "apexcharts";
import { useQuery } from "@tanstack/react-query";
import ChartTab, { type ChartTabId } from "../common/ChartTab";
import dynamic from "next/dynamic";
import {
  DASHBOARD_INSIGHTS_QUERY_KEY,
  fetchDashboardInsights,
} from "@/lib/query/dashboardQueries";
import { getSummaryTotalsFromBundle } from "./statisticsChartMockData";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  STATISTICS_CHART_HEIGHT,
  STATISTICS_SERIES_COLORS,
  STATISTICS_SUMMARY_CARD_ACCENTS,
} from "@/constants/statisticsChartTheme";
import { useHtmlDarkClass } from "@/hooks/useHtmlDarkClass";
import type {
  DashboardInsightRangeValue,
  DashboardInsightsResponse,
} from "@/types/api";

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
  return formatMoney(value, "THB", { decimals: 0 });
}

type ChartKind = "column" | "line";

const CHART_KIND_LABELS: Record<ChartKind, string> = {
  column: "Column",
  line: "Line",
};

export type StatisticsChartProps = {
  insightRange?: DashboardInsightRangeValue;
};

function StatisticsChartContent({
  insights,
}: {
  insights: DashboardInsightsResponse;
}) {
  const [timeRange, setTimeRange] = useState<ChartTabId>("month");
  const [chartKind, setChartKind] = useState<ChartKind>("line");
  const isDarkChart = useHtmlDarkClass();

  const bundle = insights.statistics[timeRange];
  const clicksAvailable = insights.availability.clicks.available;
  const displayedSeries = useMemo(
    () =>
      clicksAvailable
        ? bundle.series
        : bundle.series.filter((row) => row.name !== "Clicks"),
    [bundle.series, clicksAvailable],
  );

  const summaryTotals = useMemo(
    () => getSummaryTotalsFromBundle(bundle),
    [bundle],
  );

  const summaryCards = useMemo(
    () =>
      [
        {
          label: "Clicks",
          value: clicksAvailable
            ? summaryTotals.clicks.toLocaleString("en-US")
            : "Unavailable",
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
    [clicksAvailable, summaryTotals],
  );

  const isBar = chartKind === "column";

  const options: ApexOptions = useMemo(() => {
    const tab = bundle;
    const seriesColors = [...STATISTICS_SERIES_COLORS].filter(
      (_color, index) => clicksAvailable || index !== 0,
    );
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
        width: "100%",
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
          formatter: (val: number, opts?: { seriesIndex?: number }) => {
            const idx = opts?.seriesIndex ?? 0;
            const seriesName = displayedSeries[idx]?.name;
            if (
              seriesName === "Sale Amount" ||
              seriesName === "Estimated Earnings"
            ) {
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
      yaxis: displayedSeries.map((row) => {
        const isMoney =
          row.name === "Sale Amount" || row.name === "Estimated Earnings";
        const isPrimaryCount = clicksAvailable
          ? row.name === "Clicks"
          : row.name === "Conversions";
        const isPrimaryMoney = row.name === "Sale Amount";
        return {
          seriesName: row.name,
          show: isPrimaryCount || isPrimaryMoney,
          ...(isPrimaryMoney ? { opposite: true } : {}),
          ...(isPrimaryCount || isPrimaryMoney
            ? {
                title: {
                  text: isMoney
                    ? "Sale & earnings (THB)"
                    : clicksAvailable
                      ? "Clicks / conversions"
                      : "Conversions",
                  style: {
                    fontSize: "11px",
                    color: isDarkChart ? "#9CA3AF" : "#6B7280",
                  },
                },
                labels: {
                  style: {
                    fontSize: "12px",
                    colors: [isDarkChart ? "#9CA3AF" : "#6B7280"],
                  },
                  formatter: (value: number) =>
                    isMoney
                      ? formatThb(value)
                      : Number(value).toLocaleString("en-US"),
                },
              }
            : {}),
        };
      }),
    };
  }, [bundle, clicksAvailable, displayedSeries, isBar, isDarkChart]);

  const series = displayedSeries;
  return (
    <div className="max-w-full min-w-0 rounded-2xl border border-gray-200 bg-white px-5 pt-5 pb-5 transition-shadow duration-300 ease-out sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-6 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        {/*
          Avoid w-full + flex-row: the title column can shrink to ~0px (min-w-0), which makes
          the subtitle render one character per line. Use flex-1 min-w-0 for the text block and
          shrink-0 for the tab control.
        */}
        <div className="w-full min-w-0 sm:flex-1 sm:basis-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="text-theme-sm mt-1 max-w-full leading-relaxed text-pretty text-gray-500 dark:text-gray-400">
            {clicksAvailable
              ? "Clicks, conversions, sale amount & estimated earnings"
              : "Conversions, sale amount & estimated earnings (click analytics unavailable)"}
            <span className="text-gray-400 dark:text-gray-500">
              {" "}
              — {bundle.description}
              {" (from conversion data)"}
            </span>
          </p>
        </div>
        <div className="flex w-full min-w-0 shrink-0 items-start justify-start sm:w-auto sm:justify-end">
          <ChartTab value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div
        className="mb-6 flex flex-col gap-4"
        role="region"
        aria-label="Statistics summary"
      >
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
          Summary
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border border-l-4 border-gray-100 p-4 transition-all duration-200 ease-out hover:shadow-sm dark:border-gray-800 ${card.accent}`}
            >
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {card.label}
              </p>
              <p className="text-title-sm mt-2 font-bold text-gray-800 dark:text-white/90">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
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
              className={`text-theme-sm rounded-md px-2.5 py-2 text-left font-medium transition-all duration-200 ease-out active:scale-[0.97] sm:px-3 ${
                chartKind === key
                  ? "shadow-theme-xs bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {CHART_KIND_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="custom-scrollbar max-w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <div
          className={`w-full min-w-0 ${
            timeRange === "day"
              ? "min-w-[1400px] xl:min-w-full"
              : "min-w-[1000px] xl:min-w-full"
          }`}
        >
          <div className="w-full min-w-0 rounded-xl bg-slate-50/90 p-2 ring-1 ring-slate-200/80 dark:bg-gray-900/40 dark:ring-gray-700/80">
            <div
              className="w-full min-w-0"
              style={{ minHeight: STATISTICS_CHART_HEIGHT }}
            >
              <ReactApexChart
                key={`${chartKind}-${timeRange}-${isBar ? "bar" : "line"}`}
                options={options}
                series={series}
                type={isBar ? "bar" : "line"}
                width="100%"
                height={STATISTICS_CHART_HEIGHT}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatisticsChart({
  insightRange = "30d",
}: StatisticsChartProps = {}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, insightRange],
    queryFn: () => fetchDashboardInsights(insightRange),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-8 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading dashboard statistics…
        </p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-800 dark:border-error-800 dark:bg-error-950/30 dark:text-error-200 rounded-xl border px-4 py-3 text-sm"
      >
        {getApiErrorMessage(
          error,
          "Could not load dashboard statistics. Refresh the page or check your connection.",
        )}
      </p>
    );
  }

  return <StatisticsChartContent insights={data} />;
}
