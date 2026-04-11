import type { Metadata } from "next";
import { awaitPageDynamicProps, type DefaultAppPageProps } from "@/lib/nextAppPageProps";
import { DashboardWelcome } from "@/components/ecommerce/DashboardWelcome";
import { DashboardInsightsAnalytics } from "@/components/ecommerce/DashboardInsightsAnalytics";
import { DashboardWithdrawSummary } from "@/components/ecommerce/DashboardWithdrawSummary";
import React from "react";
import RecentActivity from "@/components/ecommerce/RecentActivity";

export const metadata: Metadata = {
  title: "GoGoCash Admin – Management Dashboard",
  description:
    "GoGoCash admin dashboard – users, conversions, payout, withdrawals, and activity",
};

export default async function DashboardPage(props: DefaultAppPageProps) {
  await awaitPageDynamicProps(props);
  return (
    <div className="min-w-0 space-y-8">
      <section className="min-w-0" aria-label="Welcome">
        <DashboardWelcome />
      </section>

      <DashboardInsightsAnalytics />

      {/* Withdrawals & cash flow */}
      <section className="min-w-0">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Withdrawals & cash flow
        </h2>
        <div className="grid min-w-0 grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 min-w-0">
            <DashboardWithdrawSummary />
          </div>
        </div>
      </section>

      {/* Recent activity: conversions & withdrawals */}
      <section className="min-w-0">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Recent activity
        </h2>
        <div className="grid min-w-0 grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 min-w-0">
            <RecentActivity />
          </div>
        </div>
      </section>
    </div>
  );
}
