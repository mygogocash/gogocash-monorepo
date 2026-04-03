import type { ChartTabId } from "@/components/common/ChartTab";

export type StatisticsMockBundle = {
  categories: string[];
  series: {
    name: "Clicks" | "Conversions" | "Sale Amount" | "Estimated Earnings";
    data: number[];
  }[];
  /** Shown under the Statistics title */
  description: string;
};

export function getSummaryTotalsFromBundle(bundle: StatisticsMockBundle): {
  clicks: number;
  conversions: number;
  saleAmount: number;
  estimatedEarnings: number;
} {
  const sum = (i: number) => bundle.series[i].data.reduce((a, b) => a + b, 0);
  return {
    clicks: sum(0),
    conversions: sum(1),
    saleAmount: sum(2),
    estimatedEarnings: sum(3),
  };
}

/** Mock statistics for ChartTab: Day, Week, Monthly, Quarterly, Annually */
export const STATISTICS_MOCK_BY_TAB: Record<ChartTabId, StatisticsMockBundle> = {
  day: {
    description: "Today (hourly)",
    categories: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
    series: [
      {
        name: "Clicks",
        data: [
          38, 32, 28, 25, 30, 48, 72, 95, 102, 88, 84, 90, 96, 92, 88, 85, 91, 98, 94, 78, 65, 52, 44, 40,
        ],
      },
      {
        name: "Conversions",
        data: [4, 3, 2, 2, 3, 6, 9, 12, 14, 11, 10, 11, 12, 11, 10, 9, 10, 12, 11, 8, 7, 5, 4, 4],
      },
      {
        name: "Sale Amount",
        data: [
          1200, 980, 820, 760, 950, 2100, 3800, 5200, 5600, 4800, 4500, 4900, 5100, 5000, 4700, 4600, 4800,
          5200, 4900, 3600, 2800, 1900, 1500, 1300,
        ],
      },
      {
        name: "Estimated Earnings",
        data: [58, 48, 40, 36, 46, 102, 188, 258, 278, 238, 224, 244, 254, 248, 234, 228, 238, 258, 244, 178, 138, 94, 74, 64],
      },
    ],
  },
  week: {
    description: "This week (daily)",
    categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    series: [
      {
        name: "Clicks",
        data: [2100, 2280, 2190, 2350, 2520, 2680, 2410],
      },
      {
        name: "Conversions",
        data: [298, 322, 305, 328, 352, 378, 340],
      },
      {
        name: "Sale Amount",
        data: [78_200, 84_100, 81_500, 88_200, 94_800, 101_200, 92_400],
      },
      {
        name: "Estimated Earnings",
        data: [3880, 4180, 4040, 4380, 4700, 5020, 4580],
      },
    ],
  },
  month: {
    description: `Year ${new Date().getFullYear()} (monthly)`,
    categories: [
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
    ],
    series: [
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
    ],
  },
  quarter: {
    description: `Year ${new Date().getFullYear()} (quarters)`,
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      {
        name: "Clicks",
        data: [3850, 4120, 4680, 5020],
      },
      {
        name: "Conversions",
        data: [520, 558, 632, 678],
      },
      {
        name: "Sale Amount",
        data: [142_000, 158_200, 182_400, 198_600],
      },
      {
        name: "Estimated Earnings",
        data: [7080, 7880, 9080, 9880],
      },
    ],
  },
  year: {
    description: "Last 5 years",
    categories: [
      String(new Date().getFullYear() - 4),
      String(new Date().getFullYear() - 3),
      String(new Date().getFullYear() - 2),
      String(new Date().getFullYear() - 1),
      String(new Date().getFullYear()),
    ],
    series: [
      {
        name: "Clicks",
        data: [482_000, 528_000, 601_000, 678_000, 742_000],
      },
      {
        name: "Conversions",
        data: [68_200, 74_800, 84_500, 95_200, 104_800],
      },
      {
        name: "Sale Amount",
        data: [18_200_000, 20_100_000, 22_800_000, 25_400_000, 27_900_000],
      },
      {
        name: "Estimated Earnings",
        data: [908_000, 1_002_000, 1_138_000, 1_268_000, 1_392_000],
      },
    ],
  },
};
