"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/icons";
import type {
  DashboardQuestFunnelCounts,
  DashboardQuestLifecycle,
  DashboardQuestMetrics,
} from "@/types/api";

type Props = {
  quests: DashboardQuestMetrics;
  rangeLabel: string;
};

function funnelMax(f: DashboardQuestFunnelCounts): number {
  return Math.max(f.viewed, f.joined, f.tasksStarted, f.fullyCompleted, 1);
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 1000) / 10;
  return (
    <div>
      <div className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-gray-800 dark:text-gray-200" aria-hidden>
          {value.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-brand-500/90 dark:bg-brand-400/90 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`${label}: ${value.toLocaleString()} of ${max.toLocaleString()}`}
        />
      </div>
    </div>
  );
}

function lifecycleBarClass(lifecycle: DashboardQuestLifecycle): string {
  switch (lifecycle) {
    case "live":
      return "bg-emerald-500/90 dark:bg-emerald-400/90";
    case "scheduled":
      return "bg-amber-500/85 dark:bg-amber-400/85";
    default:
      return "bg-slate-400/80 dark:bg-slate-500/80";
  }
}

export function DashboardQuestAnalyticsSection({ quests, rangeLabel }: Props) {
  const f = quests.funnelTotals;
  const fm = funnelMax(f);

  return (
    <div className="min-w-0 w-full space-y-6">
      <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h3 className="min-w-0 text-lg font-semibold text-gray-800 dark:text-white/90">Quest programs</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">{quests.totalQuests} in catalog</span>
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Lifecycle, engagement (mock), and overlap with {rangeLabel}. Attribution uses a heuristic vs. conversions in
          the same insight period.
        </p>
        <dl className="mt-4 grid min-w-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.04]">
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Live now</dt>
            <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">{quests.liveNow}</dd>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.04]">
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Scheduled</dt>
            <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">{quests.scheduled}</dd>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.04]">
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ended</dt>
            <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">{quests.ended}</dd>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.04]">
            <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">In window</dt>
            <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
              {quests.overlappingSelectedRange}
            </dd>
          </div>
        </dl>
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Quest programs, engagement and attributed conversions by quest</caption>
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-3 font-medium">Quest</th>
                <th className="pb-2 pr-3 font-medium">Schedule</th>
                <th className="pb-2 pr-3 font-medium">Lifecycle</th>
                <th className="pb-2 pr-3 font-medium">Tasks</th>
                <th className="pb-2 pr-3 font-medium">Enrolled</th>
                <th className="pb-2 pr-3 font-medium">Active</th>
                <th className="pb-2 pr-3 font-medium">Complete</th>
                <th className="pb-2 pr-3 font-medium">Points</th>
                <th className="pb-2 pr-3 font-medium">Attr. conv.</th>
                <th className="pb-2 font-medium">In range</th>
              </tr>
            </thead>
            <tbody>
              {quests.rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800/80">
                  <td
                    className="max-w-[120px] truncate py-2 pr-3 font-mono text-xs text-gray-900 dark:text-white"
                    title={row.id}
                  >
                    …{row.id.slice(-8)}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 dark:text-gray-300">
                    {row.startDate} – {row.endDate}
                  </td>
                  <td className="py-2 pr-3 capitalize text-gray-700 dark:text-gray-300">{row.lifecycle}</td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">{row.taskCount}</td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.participantCount.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.activeParticipants.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.funnel.fullyCompleted.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.pointsIssued.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">
                    {row.attributedConversions > 0 ? row.attributedConversions : "—"}
                  </td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{row.overlapsSelectedRange ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link
          href="/quest"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Manage quests
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Participation &amp; points</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aggregates for quests overlapping {rangeLabel} (mock funnel-derived).
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Enrolled</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.engagement.enrolledInOverlapping.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Active (est.)</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.engagement.activeInOverlapping.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Full completes</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.engagement.fullCompletesInOverlapping.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
              <dt className="text-xs text-gray-500 dark:text-gray-400">Points issued</dt>
              <dd className="mt-1 font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.engagement.pointsIssuedInOverlapping.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Attributed economics (mock)</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Share of period conversions / GMV / payout allocated by quest enrollment weight.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Attributed conversions</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.attribution.attributedConversionsInPeriod.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Share of period conv.</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.attribution.shareOfPeriodConversionsPct != null
                  ? `${quests.attribution.shareOfPeriodConversionsPct}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Attributed GMV (THB)</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.attribution.attributedGmvInPeriod.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Attributed payout (THB)</dt>
              <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
                {quests.attribution.attributedPayoutInPeriod.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Funnel (overlapping quests)</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Unique users per step — illustrative mock.</p>
          <div className="mt-4 space-y-4">
            <FunnelBar label="Viewed (est.)" value={f.viewed} max={fm} />
            <FunnelBar label="Joined / enrolled" value={f.joined} max={fm} />
            <FunnelBar label="Started a task" value={f.tasksStarted} max={fm} />
            <FunnelBar label="Fully completed" value={f.fullyCompleted} max={fm} />
          </div>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Task &amp; channel mix (catalog)</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">All configured quests — task types and promos.</p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Offer tasks</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{quests.taskMix.offerTasks}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Merchant tasks</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{quests.taskMix.merchantTasks}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600 dark:text-gray-400">Conditional tasks</dt>
              <dd className="font-semibold text-gray-900 dark:text-white">{quests.taskMix.conditionalTasks}</dd>
            </div>
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Surfaces</p>
              <ul className="mt-2 space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex justify-between gap-2">
                  <span>Facebook / post enabled</span>
                  <span className="font-semibold tabular-nums">{quests.channels.questsWithFacebook}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Line enabled</span>
                  <span className="font-semibold tabular-nums">{quests.channels.questsWithLine}</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Any banner slot</span>
                  <span className="font-semibold tabular-nums">{quests.channels.questsWithBanner}</span>
                </li>
              </ul>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Schedule timeline</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Progress through each quest window (today vs. start–end).</p>
          <ul className="mt-4 space-y-4">
            {quests.timeline.map((t) => (
              <li key={t.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-gray-800 dark:text-gray-200">…{t.shortId}</span>
                  <span className="capitalize text-gray-500 dark:text-gray-400">{t.lifecycle}</span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {t.startDate} → {t.endDate}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full rounded-full ${lifecycleBarClass(t.lifecycle)}`}
                    style={{ width: `${t.progressThroughSchedulePct}%` }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={t.progressThroughSchedulePct}
                    aria-label={`Quest …${t.shortId} schedule ${t.progressThroughSchedulePct}% elapsed`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">Leaderboard preview</h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Top mock earners for the largest overlapping quest by enrollment.
          </p>
          {quests.leaderboardPreview ? (
            <div className="mt-4 min-w-0 max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[280px] text-left text-sm">
                <caption className="sr-only">Top mock quest participants by points</caption>
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="pb-2 pr-3 font-medium">#</th>
                    <th className="pb-2 pr-3 font-medium">User</th>
                    <th className="pb-2 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {quests.leaderboardPreview.rows.map((r) => (
                    <tr key={r.rank} className="border-b border-gray-100 dark:border-gray-800/80">
                      <td className="py-2 pr-3 tabular-nums text-gray-700 dark:text-gray-300">{r.rank}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-900 dark:text-white">{r.label}</td>
                      <td className="py-2 tabular-nums text-gray-700 dark:text-gray-300">{r.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Quest …{quests.leaderboardPreview.questShortId}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No overlapping quests in this range.</p>
          )}
        </div>
      </div>
    </div>
  );
}
