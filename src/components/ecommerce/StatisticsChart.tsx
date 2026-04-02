"use client";
import React from "react";
// import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab from "../common/ChartTab";
import dynamic from "next/dynamic";

// Dynamically import the ReactApexChart component
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[310px] w-full items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading chart…</p>
    </div>
  ),
});

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatThb(value: number): string {
  return `฿${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function StatisticsChart() {
  const options: ApexOptions = {
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
    colors: ["#465FFF", "#10B981", "#F59E0B", "#9CB9FF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "line",
      toolbar: {
        show: false,
      },
    },
    stroke: {
      curve: "straight",
      width: [2, 2, 2, 2],
    },

    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    markers: {
      size: 0, // Size of the marker points
      strokeColors: "#fff", // Marker border color
      strokeWidth: 2,
      hover: {
        size: 6, // Marker size on hover
      },
    },
    grid: {
      xaxis: {
        lines: {
          show: false, // Hide grid lines on x-axis
        },
      },
      yaxis: {
        lines: {
          show: true, // Show grid lines on y-axis
        },
      },
    },
    dataLabels: {
      enabled: false, // Disable data labels
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      x: {
        format: "dd MMM yyyy",
      },
      y: {
        formatter: (val: number, opts) => {
          const idx = opts.seriesIndex;
          if (idx === 2 || idx === 3) {
            return formatThb(val);
          }
          return Number(val).toLocaleString("en-US");
        },
      },
    },
    xaxis: {
      type: "category",
      categories: [...MONTHS],
      axisBorder: {
        show: false, // Hide x-axis border
      },
      axisTicks: {
        show: false, // Hide x-axis ticks
      },
      tooltip: {
        enabled: false, // Disable tooltip for x-axis points
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

  const series = [
    {
      name: "Clicks",
      data: [1240, 1420, 1180, 1310, 1280, 1195, 1340, 1620, 1920, 1780, 2050, 1880],
    },
    {
      name: "Conversions",
      data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
      name: "Sale Amount",
      data: [45200, 52100, 38400, 41200, 47800, 44100, 49300, 61200, 72400, 68100, 75200, 70100],
    },
    {
      name: "Estimated Earnings",
      data: [2260, 2610, 1840, 2080, 2460, 2280, 2520, 3120, 3680, 3420, 3820, 3510],
    },
  ];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Statistics
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Clicks, conversions, sale amount & estimated earnings by month
            <span className="ml-1 text-gray-400 dark:text-gray-500">
              (Jan–Dec {new Date().getFullYear()})
            </span>
          </p>
        </div>
        <div className="flex items-start w-full gap-3 sm:justify-end">
          <ChartTab />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[1000px] xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={310}
          />
        </div>
      </div>
    </div>
  );
}
