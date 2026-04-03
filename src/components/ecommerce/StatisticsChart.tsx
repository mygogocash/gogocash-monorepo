"use client";
import React, { useMemo, useState } from "react";
// import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab, { type ChartTabId } from "../common/ChartTab";
import dynamic from "next/dynamic";
import {
  getSummaryTotalsFromBundle,
  STATISTICS_MOCK_BY_TAB,
} from "./statisticsChartMockData";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[310px] w-full items-center justify-center rounded-lg bg-gray-50 transition-opacity duration-300 dark:bg-gray-800/50">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart…</p>
    </div>
  ),
});

function formatThb(value: number): string {
  return `฿${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

type ChartKind = "column" | "stackedColumn" | "line";

const CHART_KIND_LABELS: Record<ChartKind, string> = {
  column: "Column",
  stackedColumn: "Stacked column",
  line: "Line",
};

export default function StatisticsChart() {
  const [timeRange, setTimeRange] = useState<ChartTabId>("month");
  const [chartKind, setChartKind] = useState<ChartKind>("line");

  const bundle = STATISTICS_MOCK_BY_TAB[timeRange];

  const summaryTotals = useMemo(
    () => getSummaryTotalsFromBundle(STATISTICS_MOCK_BY_TAB[timeRange]),
    [timeRange],
  );

  const summaryCards = [
    {
      label: "Clicks",
      value: summaryTotals.clicks.toLocaleString("en-US"),
      accent: "border-l-[#465FFF] bg-[#465FFF]/[0.06] dark:bg-[#465FFF]/10",
    },
    {
      label: "Conversions",
      value: summaryTotals.conversions.toLocaleString("en-US"),
      accent: "border-l-[#10B981] bg-[#10B981]/[0.06] dark:bg-[#10B981]/10",
    },
    {
      label: "Sale amount",
      value: formatThb(summaryTotals.saleAmount),
      accent: "border-l-[#F59E0B] bg-[#F59E0B]/[0.06] dark:bg-[#F59E0B]/10",
    },
    {
      label: "Estimated earnings",
      value: formatThb(summaryTotals.estimatedEarnings),
      accent: "border-l-[#9CB9FF] bg-[#9CB9FF]/[0.12] dark:bg-[#9CB9FF]/15",
    },
  ] as const;

  const isBar = chartKind === "column" || chartKind === "stackedColumn";
  const isStackedBar = chartKind === "stackedColumn";

  const options: ApexOptions = useMemo(() => {
    const tab = STATISTICS_MOCK_BY_TAB[timeRange];
    const seriesColors = ["#465FFF", "#10B981", "#F59E0B", "#9CB9FF"] as const;
    /** Line strokes use Fill.fillPath() in ApexCharts; gradient fill becomes the stroke paint and reads nearly invisible. */
    const lineStroke = {
      curve: "straight" as const,
      width: [3, 3, 3, 3],
      lineCap: "round" as const,
      colors: [...seriesColors],
    };
    return {
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit, sans-serif",
        fontSize: "12px",
        markers: {
          size: 4,
          strokeWidth: 0,
        },
      },
      colors: [...seriesColors],
      chart: {
        fontFamily: "Outfit, sans-serif",
        height: 310,
        type: isBar ? "bar" : "line",
        stacked: isBar && isStackedBar,
        toolbar: {
          show: false,
        },
        animations: {
          enabled: true,
          easing: "easeinout",
          speed: 450,
        },
      },
      // Never set `plotOptions: undefined` — it overwrites Apex defaults and breaks
      // `config.plotOptions.line` (runtime: Cannot read properties of undefined (reading 'line')).
      ...(isBar
        ? {
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: isStackedBar ? "62%" : "55%",
                /** Rounded tops for each bar; stacked segments get rounded tops too */
                borderRadius: 6,
                borderRadiusApplication: "end",
                ...(isStackedBar ? { borderRadiusWhenStacked: "all" as const } : {}),
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
      // Line/area: do not use `fill: { type: "solid", opacity: 0 }` — v4 can drop strokes. For `chart.type:
      // "line"`, Apex draws stroke from fillPath(); gradient fills make the stroke a faint gradient — use solid.
      fill: isBar
        ? { type: "solid", opacity: 1 }
        : { type: "solid", opacity: 1 },
      markers: isBar
        ? { size: 0 }
        : {
            size: 0,
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: { size: 6 },
          },
      grid: {
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
        x: {
          format: "dd MMM yyyy",
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
            style: { fontSize: "11px", color: "#6B7280" },
          },
          labels: {
            style: {
              fontSize: "12px",
              colors: ["#6B7280"],
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
            style: { fontSize: "11px", color: "#6B7280" },
          },
          labels: {
            style: {
              fontSize: "12px",
              colors: ["#6B7280"],
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
  }, [isBar, isStackedBar, timeRange]);

  const series = useMemo(() => STATISTICS_MOCK_BY_TAB[timeRange].series, [timeRange]);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 transition-shadow duration-300 ease-out dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Clicks, conversions, sale amount & estimated earnings
            <span className="ml-1 text-gray-400 dark:text-gray-500">— {bundle.description}</span>
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
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
          {(["column", "stackedColumn", "line"] as const).map((key) => (
            <button
              key={key}
              type="button"
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

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div
          className={
            timeRange === "day"
              ? "min-w-[1400px] xl:min-w-full"
              : "min-w-[1000px] xl:min-w-full"
          }
        >
          <ReactApexChart
            key={`${chartKind}-${timeRange}-${isBar ? "bar" : "line"}`}
            options={options}
            series={series}
            type={isBar ? "bar" : "line"}
            height={310}
          />
        </div>
      </div>
    </div>
  );
}
