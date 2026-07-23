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
