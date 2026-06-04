"use client";

import {
  ExecutiveAlertList,
  ExecutiveBarChart,
  ExecutiveCohortTable,
  ExecutiveFiltersBar,
  ExecutiveFunnel,
  ExecutiveKpiCard,
  ExecutiveLeaderboard,
  ExecutiveLineChart,
  ExecutiveWaterfallTable,
} from "@/components/executive";
import { applyExecutiveFilters } from "@/data/executive/mockExecutiveData";
import type { ExecutiveFilters } from "@/data/executive/types";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Executive overview", short: "Overview" },
  { id: "growth", label: "Growth & acquisition", short: "Growth" },
  { id: "revenue", label: "Revenue & unit economics", short: "Revenue" },
  { id: "engagement", label: "Engagement & retention", short: "Engagement" },
  { id: "partners", label: "Merchants & partners", short: "Partners" },
  { id: "operations", label: "Operations & health", short: "Operations" },
] as const;

function fmtUsd(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M USD`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k USD`;
  return `${n.toLocaleString()} USD`;
}

function fmtNum(n: number) {
  return n.toLocaleString();
}

export default function ExecutiveDashboardPageClient() {
  const [filters, setFilters] = useState<ExecutiveFilters>({
    range: "30d",
    country: "all",
    merchantCategory: "all",
    channel: "all",
  });
  const [activeSectionId, setActiveSectionId] = useState<string>(SECTIONS[0].id);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSectionId(id);
  }, []);

  useEffect(() => {
    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n != null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0].target.id;
        if (SECTIONS.some((s) => s.id === id)) setActiveSectionId(id);
      },
      { root: null, rootMargin: "-96px 0px -45% 0px", threshold: [0.08, 0.2, 0.35, 0.5] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const data = useMemo(() => applyExecutiveFilters(filters), [filters]);

  const merchantLeaderboard = useMemo(
    () =>
      data.merchants
        .slice()
        .sort((a, b) => b.gmv - a.gmv)
        .map((m, i) => ({
          rank: i + 1,
          name: m.name,
          secondary: m.category,
          primary: fmtUsd(m.gmv),
          trend: "up" as const,
        })),
    [data.merchants],
  );

  const verticalBarData = data.verticals.map((v) => ({
    vertical: v.vertical.slice(0, 12),
    gmv: v.gmv,
  }));

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <div className="min-w-0 flex-1 space-y-8">
        <header className="border-b border-gray-200 pb-6 dark:border-gray-800">
          <p className="text-[10px] font-semibold tracking-widest text-brand-600 uppercase dark:text-brand-400">
            GoGoCash · Leadership
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">
            Executive dashboard
          </h1>
          <p className="mt-2 w-full max-w-none text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Real-time view of growth, monetization, engagement, partner performance, and operational health.
            MVP-stage cashback platform — AI support, credit scoring, quests, up to 30% instant cashback.
          </p>
        </header>

        <ExecutiveFiltersBar value={filters} onChange={setFilters} />

        <nav
          aria-label="Executive dashboard sections"
          role="navigation"
          className="sticky top-[4.5rem] z-30 -mx-1 scroll-mt-0 border-b border-gray-200/90 bg-white/95 pb-0 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/95"
        >
          <div className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => {
              const isActive = activeSectionId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={isActive ? true : undefined}
                  onClick={() => scrollToSection(s.id)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors sm:px-3.5 sm:text-sm ${
                    isActive
                      ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* KPI strip — id=overview for section scroll target */}
        <div
          id="overview"
          className="scroll-mt-36 rounded-xl border border-gray-200/90 bg-white/95 p-3 shadow-md dark:border-gray-800 dark:bg-gray-950/95"
        >
          <p className="mb-2 text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Executive overview · KPI strip
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            <ExecutiveKpiCard
              kpiId="total_users"
              label="Total users"
              value={fmtNum(data.overview.totalUsers)}
              tone="positive"
            />
            <ExecutiveKpiCard
              kpiId="mau"
              label="Monthly active users"
              value={fmtNum(data.overview.monthlyActiveUsers)}
              tone="positive"
            />
            <ExecutiveKpiCard kpiId="gmv" label="GMV" value={fmtUsd(data.overview.gmvUsd)} tone="positive" />
            <ExecutiveKpiCard
              kpiId="net_revenue"
              label="Net revenue"
              value={fmtUsd(data.overview.netRevenueUsd)}
              tone="positive"
            />
            <ExecutiveKpiCard
              kpiId="transactions"
              label="Transactions"
              value={fmtNum(data.overview.totalTransactions)}
            />
            <ExecutiveKpiCard
              kpiId="merchant_integrations"
              label="Merchant integrations"
              value={fmtNum(data.overview.merchantIntegrations)}
              tone="positive"
            />
            <ExecutiveKpiCard
              kpiId="active_partners"
              label="Active partners"
              value={fmtNum(data.overview.activePartners)}
            />
            <ExecutiveKpiCard
              kpiId="cashback_issued"
              label="Cashback issued"
              value={fmtUsd(data.overview.cashbackIssuedUsd)}
            />
            <ExecutiveKpiCard
              kpiId="mom_growth"
              label="MoM growth"
              value={`${data.overview.monthlyGrowthRatePct.toFixed(1)}%`}
              tone="positive"
            />
            <ExecutiveKpiCard
              kpiId="first_tx_conversion"
              label="First-tx conversion"
              value={`${data.overview.conversionFirstTxPct.toFixed(1)}%`}
              tone="warning"
            />
            <ExecutiveKpiCard
              kpiId="repeat_tx_rate"
              label="Repeat tx rate"
              value={`${data.overview.repeatTransactionRatePct.toFixed(1)}%`}
              tone="positive"
            />
            <ExecutiveKpiCard
              kpiId="target_progress"
              label="Vs annual targets"
              value={`${data.overview.annualTargetProgressPct}%`}
              sublabel="Weighted plan progress"
              tone="positive"
            />
          </div>
        </div>

        <section id="growth" className="scroll-mt-36 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Growth & acquisition</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveLineChart
              data={data.newUsersTrend}
              title="New users (weekly trend)"
              formatY={(n) => `${(n / 1000).toFixed(0)}k`}
            />
            <ExecutiveFunnel stages={data.funnel} title="Acquisition funnel" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveBarChart
              data={data.channelMix.map((c) => ({ channel: c.channel, users: c.users }))}
              xKey="channel"
              dataKey="users"
              title="Channel mix (users)"
              formatY={(n) => `${(n / 1000).toFixed(0)}k`}
            />
            <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Acquisition economics</h3>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <dt className="text-[10px] font-semibold text-gray-500 uppercase">CPA</dt>
                  <dd className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {fmtUsd(data.unitEconomics.cpaUsd)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <dt className="text-[10px] font-semibold text-gray-500 uppercase">Referral contribution</dt>
                  <dd className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {data.unitEconomics.referralContributionPct.toFixed(1)}%
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <dt className="text-[10px] font-semibold text-gray-500 uppercase">CAC</dt>
                  <dd className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {fmtUsd(data.unitEconomics.cacUsd)}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <dt className="text-[10px] font-semibold text-gray-500 uppercase">Payback</dt>
                  <dd className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                    {data.unitEconomics.paybackMonths.toFixed(1)} mo
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section id="revenue" className="scroll-mt-36 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue & unit economics</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveLineChart
              data={data.gmvTrend}
              title="GMV trend"
              formatY={(n) => fmtUsd(n)}
            />
            <ExecutiveWaterfallTable steps={data.revenueWaterfall} title="Revenue mix waterfall (illustrative)" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ExecutiveKpiCard
              label="Blended take rate"
              value={`${data.unitEconomics.blendedTakeRatePct.toFixed(1)}%`}
            />
            <ExecutiveKpiCard label="ARPU" value={fmtUsd(data.unitEconomics.arpuUsd)} />
            <ExecutiveKpiCard label="LTV" value={fmtUsd(data.unitEconomics.ltvUsd)} />
            <ExecutiveKpiCard label="CAC" value={fmtUsd(data.unitEconomics.cacUsd)} tone="neutral" />
          </div>
        </section>

        <section id="engagement" className="scroll-mt-36 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engagement & retention</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">DAU / WAU / MAU</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">DAU</dt>
                  <dd className="font-mono font-semibold">{fmtNum(data.dauWauMau.dau)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">WAU</dt>
                  <dd className="font-mono font-semibold">{fmtNum(data.dauWauMau.wau)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">MAU</dt>
                  <dd className="font-mono font-semibold">{fmtNum(data.dauWauMau.mau)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                  <dt className="text-gray-500">Stickiness (DAU/MAU)</dt>
                  <dd className="font-mono font-semibold">{(data.dauWauMau.stickiness * 100).toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
            <ExecutiveCohortTable rows={data.cohorts} title="Cohort retention" />
            <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Engagement signals</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex justify-between">
                  <span>Quest participation</span>
                  <span className="font-mono font-medium">{data.engagement.questParticipationPct.toFixed(1)}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Cashback redemption</span>
                  <span className="font-mono font-medium">{data.engagement.cashbackRedemptionPct.toFixed(1)}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Avg sessions / week</span>
                  <span className="font-mono font-medium">{data.engagement.avgSessionsPerWeek.toFixed(1)}</span>
                </li>
                <li className="flex justify-between">
                  <span>NPS proxy</span>
                  <span className="font-mono font-medium text-emerald-600">+{data.engagement.npsProxy}</span>
                </li>
                <li className="flex justify-between">
                  <span>Churn risk flags</span>
                  <span className="font-mono font-medium text-amber-600">
                    {fmtNum(data.engagement.churnRiskFlags)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="partners" className="scroll-mt-36 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Merchants & partners</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ExecutiveLeaderboard
              title="Top merchants by GMV"
              rows={merchantLeaderboard}
              primaryHeader="GMV"
              secondaryHeader="Trend vs prior period (mock)"
            />
            <ExecutiveBarChart
              data={verticalBarData}
              xKey="vertical"
              dataKey="gmv"
              title="Partner GMV by vertical"
              formatY={(n) => fmtUsd(n)}
            />
          </div>
          <div className="-mx-3 overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200/90 bg-white px-3 sm:mx-0 sm:px-0 dark:border-gray-800 dark:bg-gray-900/60">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">GMV</th>
                  <th className="px-4 py-3 text-right">Txns</th>
                  <th className="px-4 py-3 text-right">Conv %</th>
                  <th className="px-4 py-3 text-right">Cashback cost</th>
                </tr>
              </thead>
              <tbody>
                {data.merchants.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{m.name}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{m.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{fmtUsd(m.gmv)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{fmtNum(m.transactions)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.conversionRate.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      {fmtUsd(m.cashbackCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="operations" className="scroll-mt-36 space-y-4 pb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operations & service health</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <ExecutiveKpiCard
              label="Cashback success"
              value={`${data.ops.cashbackSuccessRate.toFixed(1)}%`}
              tone="positive"
            />
            <ExecutiveKpiCard
              label="Delayed cashback"
              value={fmtNum(data.ops.delayedCashback)}
              tone="warning"
            />
            <ExecutiveKpiCard
              label="Failed cashback"
              value={fmtNum(data.ops.failedCashback)}
              tone="negative"
            />
            <ExecutiveKpiCard label="Tickets opened" value={fmtNum(data.ops.ticketsOpened)} />
            <ExecutiveKpiCard
              label="First response"
              value={`${data.ops.avgFirstResponseMin} min`}
              tone="positive"
            />
            <ExecutiveKpiCard label="Avg resolution" value={`${data.ops.avgResolutionHrs} h`} />
            <ExecutiveKpiCard label="SLA compliance" value={`${data.ops.slaCompliancePct.toFixed(1)}%`} />
            <ExecutiveKpiCard label="AI containment" value={`${data.ops.aiContainmentPct}%`} />
            <ExecutiveKpiCard label="Uptime" value={`${data.ops.uptimePct}%`} tone="positive" />
            <ExecutiveKpiCard label="Releases (30d)" value={String(data.ops.releases30d)} />
            <ExecutiveKpiCard
              label="Open bugs P0/P1"
              value={`${data.ops.openBugs.p0} / ${data.ops.openBugs.p1}`}
              tone={data.ops.openBugs.p0 > 0 ? "negative" : "warning"}
            />
            <ExecutiveKpiCard label="P2 backlog" value={String(data.ops.openBugs.p2)} />
          </div>
        </section>

      </div>

      <aside className="hidden w-80 shrink-0 xl:block">
        <div className="sticky top-24 space-y-4">
          <ExecutiveAlertList alerts={data.alerts} />
          <div className="rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <p className="font-semibold text-gray-700 dark:text-gray-300">Data contract</p>
            <p className="mt-2 leading-relaxed">
              Mock dataset:{" "}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">src/data/executive/mockExecutiveData.ts</code>
              . KPI tooltips:{" "}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">kpiDefinitions.ts</code>. Replace{" "}
              <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">applyExecutiveFilters</code> with API calls
              returning the same shapes.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
