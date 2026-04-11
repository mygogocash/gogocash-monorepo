"use client";

import { useState } from "react";
import type { DashboardInsightRange } from "@/types/api";
import { DashboardInsightRangeControl } from "@/components/ecommerce/DashboardInsightRangeControl";
import { ExecutiveSummary } from "@/components/ecommerce/ExecutiveSummary";
import { DashboardInsightDetails } from "@/components/ecommerce/DashboardInsightDetails";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";

export function DashboardInsightsAnalytics() {
  const [range, setRange] = useState<DashboardInsightRange>("30d");

  return (
    <div className="min-w-0 w-full space-y-8">
      <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="w-full min-w-0 sm:w-auto">
          <DashboardInsightRangeControl value={range} onChange={setRange} />
        </div>
      </div>

      <section className="min-w-0">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Executive summary
        </h2>
        <ExecutiveSummary range={range} />
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Insights &amp; analytics
        </h2>
        <DashboardInsightDetails range={range} />
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Performance
        </h2>
        <div className="grid min-w-0 grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 min-w-0">
            <StatisticsChart insightRange={range} />
          </div>
        </div>
      </section>
    </div>
  );
}
