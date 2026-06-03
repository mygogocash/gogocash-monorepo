"use client";

import { useState } from "react";
import type { DashboardInsightRangeValue } from "@/types/api";
import { DashboardInsightRangeControl } from "@/components/ecommerce/DashboardInsightRangeControl";
import { ExecutiveSummary } from "@/components/ecommerce/ExecutiveSummary";
import { DashboardInsightDetails } from "@/components/ecommerce/DashboardInsightDetails";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";

export function DashboardInsightsAnalytics() {
  const [range, setRange] = useState<DashboardInsightRangeValue>("30d");

  return (
    <div className="min-w-0 w-full space-y-8">
      <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="w-full min-w-0 sm:w-auto">
          <DashboardInsightRangeControl value={range} onChange={setRange} />
        </div>
      </div>

      <section className="min-w-0">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Executive summary
        </h2>
        <ExecutiveSummary range={range} />
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Performance
        </h2>
        <div className="grid min-w-0 grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 min-w-0">
            <StatisticsChart insightRange={range} />
          </div>
        </div>
      </section>

      <section className="min-w-0">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          Insights &amp; analytics
        </h2>
        <DashboardInsightDetails range={range} />
      </section>
    </div>
  );
}
