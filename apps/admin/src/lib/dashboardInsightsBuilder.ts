/**
 * Builds `DashboardInsightsResponse` from mock catalog data (and can be reused by a real API layer).
 */
import {
  mockConversions,
  mockMyCashback,
  mockOffers,
  mockUsers,
  mockWithdraws,
} from "@/app/api/mock/data";
import { MOCK_QUESTS, mockQuestParticipantTotal } from "@/data/mockQuests";
import type { QuestDetails } from "@/types/questTable";
import {
  affiliateNetworkIdForOfferId,
  affiliateNetworkName,
} from "@/data/affiliateNetworks";
import { parseCustomRange, parseIsoDateLocal } from "@/lib/insightRange";
import type {
  DashboardAlert,
  DashboardCommissionHealth,
  DashboardInsightRangeValue,
  DashboardInsightsResponse,
  DashboardKpiBlock,
  DashboardKpiSnapshot,
  DashboardQuestAttributionTotals,
  DashboardQuestChannelTotals,
  DashboardQuestEngagementTotals,
  DashboardQuestFunnelCounts,
  DashboardQuestLeaderboardRow,
  DashboardQuestLifecycle,
  DashboardQuestMetrics,
  DashboardQuestRow,
  DashboardQuestTaskMix,
  DashboardQuestTimelineBar,
  DashboardNetworkRow,
  DashboardStatisticsBundle,
  DashboardStatisticsByTab,
  DashboardSummaryResponse,
  DashboardTopOfferRow,
  DashboardWithdrawMetrics,
} from "@/types/api";

const MS_DAY = 86_400_000;
const CLICK_FACTOR = 10;
const MOCK_DASHBOARD_AVAILABILITY = {
  clicks: { available: true, reason: "Available from mock fixture data." },
  commissionHealth: {
    available: true,
    reason: "Available from mock fixture data.",
  },
  quests: { available: true, reason: "Available from mock fixture data." },
} as const;

type ConvRow = (typeof mockConversions)[number];

function isDashboardConversion(row: ConvRow): boolean {
  const synthetic = (row as ConvRow & { quest_synthetic_reward?: boolean })
    .quest_synthetic_reward;
  return synthetic !== true && row.offer_name !== "reward_conversion_quest";
}

function isFinanciallyEligibleConversion(row: ConvRow): boolean {
  return (
    String(row.currency ?? "").toUpperCase() === "THB" &&
    ["approved", "pending", "paid"].includes(
      String(row.conversion_status ?? "").toLowerCase(),
    )
  );
}

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function iso(d: Date): string {
  return d.toISOString();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseRangeParam(
  raw: string | null,
): DashboardInsightRangeValue {
  const value = (raw ?? "30d").trim();
  if (parseCustomRange(value)) return value;
  const r = value.toLowerCase();
  if (r === "7d" || r === "30d" || r === "90d" || r === "all") return r;
  return "30d";
}

export function rangeWindow(
  range: DashboardInsightRangeValue,
  now: Date,
): {
  current: { from: Date; to: Date };
  prior: { from: Date; to: Date } | null;
} {
  const to = now;

  const custom = parseCustomRange(range);
  if (custom) {
    const cFrom = parseIsoDateLocal(custom.from);
    const cTo = parseIsoDateLocal(custom.to);
    if (cFrom && cTo) {
      const from = startOfDay(cFrom);
      const end = endOfDay(cTo);
      const span = end.getTime() - from.getTime();
      return {
        current: { from, to: end },
        // Equal-length window immediately preceding the selection, for deltas.
        prior: { from: new Date(from.getTime() - span), to: from },
      };
    }
    // Unparseable custom token: fall through to the default preset window.
  }

  if (range === "all") {
    return {
      current: { from: new Date(0), to },
      prior: null,
    };
  }
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const from = new Date(to.getTime() - days * MS_DAY);
  const priorTo = from;
  const priorFrom = new Date(priorTo.getTime() - days * MS_DAY);
  return {
    current: { from, to },
    prior: { from: priorFrom, to: priorTo },
  };
}

function inRange(d: Date, from: Date, to: Date): boolean {
  // Half-open [from, to): the current and prior windows share the boundary
  // instant (prior.to === current.from), so an upper-inclusive check would
  // count a conversion landing exactly on it in both periods.
  return d.getTime() >= from.getTime() && d.getTime() < to.getTime();
}

function parseQuestUsDate(s: string): Date | null {
  const t = s.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const month = Number(m[1]) - 1;
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month, day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangesOverlap(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date,
): boolean {
  return aFrom.getTime() <= bTo.getTime() && bFrom.getTime() <= aTo.getTime();
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function sumTaskPoints(q: QuestDetails): number {
  const tasks = q.tasks;
  if (!tasks?.length) return 0;
  return tasks.reduce((s, t) => s + (Number(t.points) || 0), 0);
}

function taskMixFromQuest(q: QuestDetails): {
  offer: number;
  merchant: number;
  conditional: number;
} {
  const tasks = q.tasks ?? [];
  let offer = 0;
  let merchant = 0;
  let conditional = 0;
  for (const t of tasks) {
    if (t.taskType === "offer") offer += 1;
    else merchant += 1;
    if (t.condition != null) conditional += 1;
  }
  return { offer, merchant, conditional };
}

function questFunnel(enrolled: number, id: string): DashboardQuestFunnelCounts {
  const h = simpleHash(id);
  const bias = (h % 19) / 190;
  const joined = enrolled;
  const viewed = Math.max(joined, Math.round(joined * (1.06 + bias)));
  let tasksStarted = Math.max(0, Math.floor(joined * (0.61 + bias)));
  let fullyCompleted = Math.max(0, Math.floor(joined * (0.27 + bias * 0.6)));
  tasksStarted = Math.min(tasksStarted, joined);
  fullyCompleted = Math.min(fullyCompleted, tasksStarted);
  return { viewed, joined, tasksStarted, fullyCompleted };
}

function questPromoChannelFlags(q: QuestDetails): {
  facebook: boolean;
  line: boolean;
  banner: boolean;
} {
  return {
    facebook:
      q.facebookPage === "Yes" ||
      q.facebookPost === "Yes" ||
      Boolean(q.facebookPageLink || q.facebookPostLink),
    line: q.line === "Yes" || Boolean(q.lineLink),
    banner:
      q.bannerEn === "Yes" ||
      q.bannerTh === "Yes" ||
      q.subBannerEn === "Yes" ||
      q.subBannerTh === "Yes",
  };
}

function sortAlertsBySeverity(alerts: DashboardAlert[]): DashboardAlert[] {
  const rank = { high: 0, medium: 1, low: 2 };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function scheduleProgressPct(
  now: Date,
  startSod: Date,
  endEod: Date,
  lifecycle: DashboardQuestLifecycle,
): number {
  if (lifecycle === "ended") return 100;
  if (lifecycle === "scheduled") return 0;
  const span = endEod.getTime() - startSod.getTime();
  if (span <= 0) return 0;
  const t = (now.getTime() - startSod.getTime()) / span;
  return Math.max(0, Math.min(100, Math.round(t * 1000) / 10));
}

function buildLeaderboardPreview(
  questId: string,
  enrolled: number,
): {
  questId: string;
  questShortId: string;
  rows: DashboardQuestLeaderboardRow[];
} {
  const questShortId = questId.slice(-8);
  const rows: DashboardQuestLeaderboardRow[] = [];
  for (let rank = 1; rank <= 5; rank += 1) {
    const base = 920 - rank * 130;
    const points = Math.max(
      120,
      base - (simpleHash(`${questId}-${rank}`) % 80),
    );
    rows.push({
      rank,
      label: `user_${Math.max(1, enrolled - rank * 113 - (simpleHash(`${rank}`) % 400))}`,
      points,
    });
  }
  return { questId, questShortId, rows };
}

function buildQuestAlerts(rows: DashboardQuestRow[]): DashboardAlert[] {
  const out: DashboardAlert[] = [];
  for (const r of rows) {
    if (r.lifecycle === "live" && r.taskCount === 0) {
      out.push({
        id: `quest-no-tasks-${r.id}`,
        severity: "high",
        title: "Live quest has no tasks",
        body: `Quest …${r.id.slice(-8)} is live but has no tasks configured — users cannot progress.`,
        href: "/quest",
      });
    }
    if (r.lifecycle === "live" && r.rewardStatus.toLowerCase() === "pending") {
      out.push({
        id: `quest-reward-pending-${r.id}`,
        severity: "low",
        title: "Live quest — reward still pending",
        body: `Quest …${r.id.slice(-8)} is live while reward status is still pending. Confirm payout rules.`,
        href: "/quest",
      });
    }
    if (
      r.lifecycle === "live" &&
      r.daysUntilEnd != null &&
      r.daysUntilEnd >= 0 &&
      r.daysUntilEnd <= 7
    ) {
      out.push({
        id: `quest-ending-${r.id}`,
        severity: "medium",
        title: `Quest ending in ${r.daysUntilEnd} day(s)`,
        body: `Quest …${r.id.slice(-8)} ends soon — review comms, stock, and reward fulfillment.`,
        href: "/quest",
      });
    }
  }
  return out;
}

function emptyFunnel(): DashboardQuestFunnelCounts {
  return { viewed: 0, joined: 0, tasksStarted: 0, fullyCompleted: 0 };
}

function addFunnel(
  a: DashboardQuestFunnelCounts,
  b: DashboardQuestFunnelCounts,
): DashboardQuestFunnelCounts {
  return {
    viewed: a.viewed + b.viewed,
    joined: a.joined + b.joined,
    tasksStarted: a.tasksStarted + b.tasksStarted,
    fullyCompleted: a.fullyCompleted + b.fullyCompleted,
  };
}

function buildQuestMetrics(
  now: Date,
  win: {
    current: { from: Date; to: Date };
    prior: { from: Date; to: Date } | null;
  },
  conversionsInPeriod: ConvRow[],
): DashboardQuestMetrics {
  let liveNow = 0;
  let scheduled = 0;
  let ended = 0;
  let overlappingSelectedRange = 0;
  let totalParticipantsInOverlapping = 0;
  const rows: DashboardQuestRow[] = [];

  const from = win.current.from;
  const to = win.current.to;

  const periodTotals = sumConversions(conversionsInPeriod);
  const catalogMix: DashboardQuestTaskMix = {
    offerTasks: 0,
    merchantTasks: 0,
    conditionalTasks: 0,
  };
  let questsWithFacebook = 0;
  let questsWithLine = 0;
  let questsWithBanner = 0;

  for (const q of MOCK_QUESTS) {
    const ch = questPromoChannelFlags(q);
    if (ch.facebook) questsWithFacebook += 1;
    if (ch.line) questsWithLine += 1;
    if (ch.banner) questsWithBanner += 1;

    const mix = taskMixFromQuest(q);
    catalogMix.offerTasks += mix.offer;
    catalogMix.merchantTasks += mix.merchant;
    catalogMix.conditionalTasks += mix.conditional;
  }

  for (const q of MOCK_QUESTS) {
    const startRaw = parseQuestUsDate(q.startDate);
    const endRaw = parseQuestUsDate(q.endDate);
    if (!startRaw || !endRaw) continue;
    const startSod = startOfDay(startRaw);
    const endEod = endOfDay(endRaw);

    let lifecycle: DashboardQuestLifecycle;
    if (now.getTime() > endEod.getTime()) lifecycle = "ended";
    else if (now.getTime() < startSod.getTime()) lifecycle = "scheduled";
    else if (q.status.toLowerCase() === "active") lifecycle = "live";
    else lifecycle = "scheduled";

    if (lifecycle === "ended") ended += 1;
    else if (lifecycle === "scheduled") scheduled += 1;
    else liveNow += 1;

    const overlapsSelectedRange = rangesOverlap(from, to, startSod, endEod);
    const enrolled = mockQuestParticipantTotal(q.id);
    if (overlapsSelectedRange) {
      overlappingSelectedRange += 1;
      totalParticipantsInOverlapping += enrolled;
    }

    const taskCount = q.tasks?.length ?? 0;
    const mix = taskMixFromQuest(q);
    const promo = questPromoChannelFlags(q);
    const funnel = questFunnel(enrolled, q.id);
    const activeParticipants = Math.min(
      enrolled,
      Math.max(
        funnel.tasksStarted,
        Math.floor(
          funnel.joined * (0.74 + (simpleHash(`${q.id}a`) % 12) / 200),
        ),
      ),
    );
    const sumPts = sumTaskPoints(q);
    const pointsIssued = Math.floor(
      funnel.fullyCompleted * sumPts * 0.92 +
        funnel.tasksStarted * sumPts * 0.22,
    );

    let daysUntilEnd: number | null = Math.ceil(
      (endEod.getTime() - now.getTime()) / MS_DAY,
    );
    if (Number.isNaN(daysUntilEnd)) daysUntilEnd = null;

    rows.push({
      id: q.id,
      status: q.status,
      rewardStatus: q.rewardStatus,
      startDate: q.startDate,
      endDate: q.endDate,
      taskCount,
      participantCount: enrolled,
      lifecycle,
      overlapsSelectedRange,
      funnel,
      activeParticipants,
      pointsIssued,
      taskOfferCount: mix.offer,
      taskMerchantCount: mix.merchant,
      conditionalTaskCount: mix.conditional,
      attributedConversions: 0,
      attributedGmv: 0,
      attributedPayout: 0,
      channelFacebook: promo.facebook,
      channelLine: promo.line,
      channelBanner: promo.banner,
      daysUntilEnd,
    });
  }

  const overlappingRows = rows.filter((r) => r.overlapsSelectedRange);
  const weightDen =
    overlappingRows.reduce((s, r) => s + r.participantCount, 0) || 1;
  for (const r of rows) {
    if (!r.overlapsSelectedRange || periodTotals.count <= 0) continue;
    const w = r.participantCount / weightDen;
    const ac = Math.floor(periodTotals.count * 0.09 * w);
    r.attributedConversions = ac;
    if (periodTotals.count > 0) {
      r.attributedGmv =
        Math.round(((periodTotals.sale * ac) / periodTotals.count) * 100) / 100;
      r.attributedPayout =
        Math.round(((periodTotals.payout * ac) / periodTotals.count) * 100) /
        100;
    }
  }

  const engagement: DashboardQuestEngagementTotals = overlappingRows.reduce(
    (acc, r) => ({
      enrolledInOverlapping: acc.enrolledInOverlapping + r.participantCount,
      activeInOverlapping: acc.activeInOverlapping + r.activeParticipants,
      fullCompletesInOverlapping:
        acc.fullCompletesInOverlapping + r.funnel.fullyCompleted,
      pointsIssuedInOverlapping: acc.pointsIssuedInOverlapping + r.pointsIssued,
    }),
    {
      enrolledInOverlapping: 0,
      activeInOverlapping: 0,
      fullCompletesInOverlapping: 0,
      pointsIssuedInOverlapping: 0,
    },
  );

  const attributionSum = overlappingRows.reduce(
    (acc, r) => ({
      attributedConversionsInPeriod:
        acc.attributedConversionsInPeriod + r.attributedConversions,
      attributedGmvInPeriod: acc.attributedGmvInPeriod + r.attributedGmv,
      attributedPayoutInPeriod:
        acc.attributedPayoutInPeriod + r.attributedPayout,
    }),
    {
      attributedConversionsInPeriod: 0,
      attributedGmvInPeriod: 0,
      attributedPayoutInPeriod: 0,
    },
  );
  const attribution: DashboardQuestAttributionTotals = {
    attributedConversionsInPeriod: attributionSum.attributedConversionsInPeriod,
    attributedGmvInPeriod:
      Math.round(attributionSum.attributedGmvInPeriod * 100) / 100,
    attributedPayoutInPeriod:
      Math.round(attributionSum.attributedPayoutInPeriod * 100) / 100,
    shareOfPeriodConversionsPct:
      periodTotals.count > 0
        ? Math.round(
            (attributionSum.attributedConversionsInPeriod /
              periodTotals.count) *
              1000,
          ) / 10
        : null,
  };

  const funnelTotals = overlappingRows.reduce(
    (acc, r) => addFunnel(acc, r.funnel),
    emptyFunnel(),
  );

  const channels: DashboardQuestChannelTotals = {
    questsWithFacebook,
    questsWithLine,
    questsWithBanner,
  };

  const timeline: DashboardQuestTimelineBar[] = rows.map((r) => {
    const startRaw = parseQuestUsDate(r.startDate);
    const endRaw = parseQuestUsDate(r.endDate);
    const startSod = startRaw ? startOfDay(startRaw) : null;
    const endEod = endRaw ? endOfDay(endRaw) : null;
    const progress =
      startSod && endEod
        ? scheduleProgressPct(now, startSod, endEod, r.lifecycle)
        : 0;
    return {
      id: r.id,
      shortId: r.id.slice(-8),
      startDate: r.startDate,
      endDate: r.endDate,
      lifecycle: r.lifecycle,
      progressThroughSchedulePct: progress,
    };
  });

  const leaderboardQuest =
    overlappingRows.length > 0
      ? [...overlappingRows].sort(
          (a, b) => b.participantCount - a.participantCount,
        )[0]
      : null;
  const leaderboardPreview = leaderboardQuest
    ? buildLeaderboardPreview(
        leaderboardQuest.id,
        leaderboardQuest.participantCount,
      )
    : null;

  return {
    totalQuests: MOCK_QUESTS.length,
    liveNow,
    scheduled,
    ended,
    overlappingSelectedRange,
    totalParticipantsInOverlapping,
    rows,
    engagement,
    attribution,
    funnelTotals,
    taskMix: catalogMix,
    channels,
    timeline,
    leaderboardPreview,
  };
}

function filterConversions(rows: ConvRow[], from: Date, to: Date): ConvRow[] {
  return rows.filter((c) => {
    const d = toDate(c.datetime_conversion);
    return d && inRange(d, from, to);
  });
}

function sumConversions(rows: ConvRow[]): {
  count: number;
  payout: number;
  sale: number;
} {
  let payout = 0;
  let sale = 0;
  for (const c of rows) {
    if (!isFinanciallyEligibleConversion(c)) continue;
    payout += Number(c.payout) || 0;
    sale += Number(c.sale_amount) || 0;
  }
  return { count: rows.length, payout, sale };
}

function countCreatedAsOf(
  rows: ReadonlyArray<{ createdAt?: unknown }>,
  to: Date,
): number {
  // Rows without a trustworthy creation timestamp cannot be claimed as-of.
  return rows.filter((row) => {
    const createdAt = toDate(row.createdAt);
    return createdAt != null && createdAt <= to;
  }).length;
}

function buildKpiBlock(
  conversionsAll: ConvRow[],
  win: {
    current: { from: Date; to: Date };
    prior: { from: Date; to: Date } | null;
  },
  periodStart: Date,
): DashboardKpiBlock {
  const gogocashUsers = countCreatedAsOf(mockUsers, win.current.to);
  const mycashbackUsers = countCreatedAsOf(mockMyCashback, win.current.to);
  const curConv =
    win.prior === null
      ? conversionsAll
      : filterConversions(conversionsAll, win.current.from, win.current.to);
  const curS = sumConversions(curConv);

  let prior: DashboardKpiSnapshot | null = null;
  if (win.prior) {
    const pConv = filterConversions(
      conversionsAll,
      win.prior.from,
      win.prior.to,
    );
    const pS = sumConversions(pConv);
    prior = {
      gogocashUsers: countCreatedAsOf(mockUsers, win.prior.to),
      mycashbackUsers: countCreatedAsOf(mockMyCashback, win.prior.to),
      conversionCount: pS.count,
      conversionTotalPayout: Math.round(pS.payout * 100) / 100,
      conversionTotalSaleAmount: Math.round(pS.sale * 100) / 100,
    };
  }

  const newUsersInPeriod = mockUsers.filter((u) => {
    const d = toDate(u.createdAt);
    return d && d >= periodStart && d <= win.current.to;
  }).length;

  return {
    current: {
      gogocashUsers,
      mycashbackUsers,
      conversionCount: curS.count,
      conversionTotalPayout: Math.round(curS.payout * 100) / 100,
      conversionTotalSaleAmount: Math.round(curS.sale * 100) / 100,
    },
    prior,
    newUsersInPeriod,
  };
}

function offerByNumericId(
  offerId: number,
): (typeof mockOffers)[number] | undefined {
  return mockOffers.find((o) => Number(o.offer_id) === offerId);
}

function buildWithdrawBuckets(
  _now: Date,
): DashboardSummaryResponse["withdrawByStatus"] {
  const buckets = {
    pending: { count: 0, total: 0, oldestAt: null as string | null },
    approved: { count: 0, total: 0 },
    rejected: { count: 0, total: 0 },
  };
  let oldestPending: Date | null = null;

  for (const w of mockWithdraws) {
    if (w.currency !== "THB") continue;
    const st = (w.status || "pending").toLowerCase() as keyof typeof buckets;
    if (st === "pending" || st === "approved" || st === "rejected") {
      const b = buckets[st] as { count: number; total: number };
      b.count += 1;
      if (st !== "rejected") b.total += Number(w.amount_total) || 0;
      if (st === "pending") {
        const cd = toDate(w.createdAt);
        if (cd && (!oldestPending || cd < oldestPending)) oldestPending = cd;
      }
    }
  }
  buckets.pending.oldestAt = oldestPending ? iso(oldestPending) : null;
  return buckets;
}

function withdrawMetrics(
  buckets: DashboardSummaryResponse["withdrawByStatus"],
  now: Date,
): DashboardWithdrawMetrics {
  const approved = buckets.approved.count;
  const rejected = buckets.rejected.count;
  const decided = approved + rejected;
  const approvalRatePct =
    decided > 0 ? Math.round((approved / decided) * 1000) / 10 : null;
  const rejectedSharePct =
    decided > 0 ? Math.round((rejected / decided) * 1000) / 10 : null;

  const cutoff = now.getTime() - 48 * 60 * 60 * 1000;
  let pendingOver48hCount = 0;
  for (const w of mockWithdraws) {
    if (w.currency !== "THB") continue;
    if ((w.status || "").toLowerCase() !== "pending") continue;
    const cd = toDate(w.createdAt);
    if (cd && cd.getTime() < cutoff) pendingOver48hCount += 1;
  }
  return { approvalRatePct, pendingOver48hCount, rejectedSharePct };
}

function conversionsByStatus(rows: ConvRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of rows) {
    const k = (c.conversion_status || "unknown").toLowerCase();
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function topOffers(rows: ConvRow[], limit: number): DashboardTopOfferRow[] {
  const map = new Map<
    string,
    {
      offerId: number;
      offerName: string;
      merchantId: number;
      networkId: string;
      providerAccount: string;
      conv: number;
      gmv: number;
      payout: number;
    }
  >();
  const latestFirst = [...rows].sort((a, b) => {
    const byTime =
      (toDate(b.datetime_conversion)?.getTime() ?? 0) -
      (toDate(a.datetime_conversion)?.getTime() ?? 0);
    return byTime || Number(b.conversion_id) - Number(a.conversion_id);
  });
  for (const c of latestFirst) {
    const offer = offerByNumericId(c.offer_id);
    const networkId = offer
      ? affiliateNetworkIdForOfferId(offer._id)
      : "unknown";
    const providerAccount = String(
      (c as ConvRow & { provider_account?: string; network_account?: string })
        .provider_account ??
        (c as ConvRow & { network_account?: string }).network_account ??
        "default",
    );
    const key = `${networkId}:${providerAccount}:${c.offer_id}`;
    const cur = map.get(key) ?? {
      offerId: c.offer_id,
      offerName: c.offer_name,
      merchantId: c.merchant_id,
      networkId,
      providerAccount,
      conv: 0,
      gmv: 0,
      payout: 0,
    };
    cur.conv += 1;
    if (isFinanciallyEligibleConversion(c)) {
      cur.gmv += Number(c.sale_amount) || 0;
      cur.payout += Number(c.payout) || 0;
    }
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([, v]) => ({
      offerId: v.offerId,
      offerName: v.offerName,
      merchantId: v.merchantId,
      networkId: v.networkId,
      providerAccount: v.providerAccount,
      conversions: v.conv,
      gmv: Math.round(v.gmv * 100) / 100,
      payout: Math.round(v.payout * 100) / 100,
      currency: "THB" as const,
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit);
}

function networkBreakdown(rows: ConvRow[]): DashboardNetworkRow[] {
  const acc = new Map<
    string,
    {
      name: string;
      conversions: number;
      gmv: number;
      payout: number;
      offers: Set<string>;
    }
  >();
  for (const c of rows) {
    const on = offerByNumericId(c.offer_id);
    const nwId = on ? affiliateNetworkIdForOfferId(on._id) : "unknown";
    const nwName = affiliateNetworkName(nwId);
    const cur = acc.get(nwId) ?? {
      name: nwName,
      conversions: 0,
      gmv: 0,
      payout: 0,
      offers: new Set<string>(),
    };
    cur.conversions += 1;
    if (isFinanciallyEligibleConversion(c)) {
      cur.gmv += Number(c.sale_amount) || 0;
      cur.payout += Number(c.payout) || 0;
    }
    const providerAccount = String(
      (c as ConvRow & { provider_account?: string; network_account?: string })
        .provider_account ??
        (c as ConvRow & { network_account?: string }).network_account ??
        "default",
    );
    cur.offers.add(`${providerAccount}:${c.offer_id}`);
    acc.set(nwId, cur);
  }

  return [...acc.entries()]
    .map(([networkId, v]) => ({
      networkId,
      networkName: v.name,
      offersCount: v.offers.size,
      conversions: v.conversions,
      gmv: Math.round(v.gmv * 100) / 100,
      payout: Math.round(v.payout * 100) / 100,
      currency: "THB" as const,
    }))
    .sort((a, b) => b.conversions - a.conversions);
}

function numPartnerCap(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function commissionHealth(): DashboardCommissionHealth {
  let missingAdminCap = 0;
  let missingPartnerCap = 0;
  let adminOverPartner = 0;
  for (const o of mockOffers) {
    if (o.disabled) continue;
    if (o.max_cap == null) missingAdminCap += 1;
    if (o.partner_max_cap == null) missingPartnerCap += 1;
    const a = o.max_cap;
    const p = numPartnerCap(o.partner_max_cap);
    if (a != null && p != null && a > p) adminOverPartner += 1;
  }
  return { missingAdminCap, missingPartnerCap, adminOverPartner };
}

function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

function buildAlerts(
  kpis: DashboardKpiBlock,
  buckets: DashboardSummaryResponse["withdrawByStatus"],
  wm: DashboardWithdrawMetrics,
  health: DashboardCommissionHealth,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  const convDelta =
    kpis.prior != null
      ? deltaPct(kpis.current.conversionCount, kpis.prior.conversionCount)
      : null;

  if (buckets.pending.count > 0) {
    alerts.push({
      id: "withdraw-pending",
      severity:
        buckets.pending.total > 50_000 || buckets.pending.count > 100
          ? "high"
          : "medium",
      title: "Withdrawal queue needs attention",
      body: `${buckets.pending.count} pending requests (${buckets.pending.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} total).`,
      href: "/withdraw?status=pending",
      metric: "pending_withdrawals",
    });
  }
  if (wm.pendingOver48hCount > 0) {
    alerts.push({
      id: "withdraw-aging",
      severity: "high",
      title: "Pending payouts over 48 hours",
      body: `${wm.pendingOver48hCount} request(s) have been pending more than 48 hours.`,
      href: "/withdraw?status=pending",
    });
  }
  if (convDelta != null && convDelta <= -15) {
    alerts.push({
      id: "conversions-down",
      severity: "medium",
      title: "Conversions down vs prior period",
      body: `Conversion count changed ${convDelta}% compared to the previous window.`,
      href: "/conversion",
      metric: "conversions",
      deltaPct: convDelta,
    });
  }
  if (health.adminOverPartner > 0) {
    alerts.push({
      id: "cap-over-partner",
      severity: "medium",
      title: "Admin max cap exceeds partner cap",
      body: `${health.adminOverPartner} offer(s) have admin max cap above the partner max cap — review in Offers / Commission Management.`,
      href: "/brands?tab=commission",
      metric: "admin_over_partner_cap",
    });
  }
  if (health.missingAdminCap > 10) {
    alerts.push({
      id: "missing-admin-cap",
      severity: "low",
      title: "Many offers without admin max cap",
      body: `${health.missingAdminCap} live offers have no admin max cap set.`,
      href: "/brands",
    });
  }
  return sortAlertsBySeverity(alerts);
}

function insightSentence(
  kpis: DashboardKpiBlock,
  buckets: DashboardSummaryResponse["withdrawByStatus"],
  ratio: number | null,
  quests: DashboardQuestMetrics,
): string {
  const parts: string[] = [];
  if (kpis.prior) {
    const d = deltaPct(
      kpis.current.conversionCount,
      kpis.prior.conversionCount,
    );
    if (d != null)
      parts.push(
        `Conversions ${d >= 0 ? "up" : "down"} ${Math.abs(d)}% vs prior period`,
      );
  }
  if (ratio != null && Number.isFinite(ratio)) {
    parts.push(`Cashback / GMV ratio ${(ratio * 100).toFixed(2)}%`);
  }
  if (buckets.pending.count > 0) {
    parts.push(`${buckets.pending.count} payout(s) pending review`);
  }
  if (quests.liveNow > 0) {
    parts.push(
      `${quests.liveNow} quest program${quests.liveNow !== 1 ? "s" : ""} live now`,
    );
  }
  if (quests.overlappingSelectedRange > 0) {
    parts.push(
      `${quests.overlappingSelectedRange} quest${quests.overlappingSelectedRange !== 1 ? "s" : ""} overlap the selected window (${quests.totalParticipantsInOverlapping.toLocaleString()} mock participants)`,
    );
  }
  if (
    quests.attribution.attributedConversionsInPeriod > 0 &&
    quests.attribution.shareOfPeriodConversionsPct != null
  ) {
    parts.push(
      `Quest-attributed conversions (mock): ${quests.attribution.attributedConversionsInPeriod} (${quests.attribution.shareOfPeriodConversionsPct}% of period)`,
    );
  }
  return parts.length
    ? parts.join(" · ") + "."
    : "Review KPIs and alerts below for the latest operational snapshot.";
}

type MockStatisticsRow = {
  date: string;
  conversions: number;
  saleAmount: number;
  payout: number;
};

function mockStatisticsBundle(
  rows: MockStatisticsRow[],
  description: string,
): DashboardStatisticsBundle {
  return {
    description,
    categories: rows.map((row) => row.date),
    series: [
      {
        name: "Clicks",
        data: rows.map((row) => row.conversions * CLICK_FACTOR),
      },
      { name: "Conversions", data: rows.map((row) => row.conversions) },
      { name: "Sale Amount", data: rows.map((row) => row.saleAmount) },
      { name: "Estimated Earnings", data: rows.map((row) => row.payout) },
    ],
  };
}

function mockStatisticsBucket(
  rows: MockStatisticsRow[],
  keyForDate: (date: Date) => string,
): MockStatisticsRow[] {
  const buckets = new Map<string, MockStatisticsRow>();
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) continue;
    const key = keyForDate(date);
    const bucket = buckets.get(key) ?? {
      date: key,
      conversions: 0,
      saleAmount: 0,
      payout: 0,
    };
    bucket.conversions += row.conversions;
    bucket.saleAmount =
      Math.round((bucket.saleAmount + row.saleAmount) * 100) / 100;
    bucket.payout = Math.round((bucket.payout + row.payout) * 100) / 100;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function statisticsFromConversions(
  rows: ConvRow[],
  range: DashboardInsightRangeValue,
): DashboardStatisticsByTab {
  const daily = new Map<string, MockStatisticsRow>();
  for (const conversion of rows) {
    const date = toDate(conversion.datetime_conversion);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    const bucket = daily.get(key) ?? {
      date: key,
      conversions: 0,
      saleAmount: 0,
      payout: 0,
    };
    bucket.conversions += 1;
    if (isFinanciallyEligibleConversion(conversion)) {
      bucket.saleAmount =
        Math.round(
          (bucket.saleAmount + (Number(conversion.sale_amount) || 0)) * 100,
        ) / 100;
      bucket.payout =
        Math.round((bucket.payout + (Number(conversion.payout) || 0)) * 100) /
        100;
    }
    daily.set(key, bucket);
  }
  const day = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  const week = mockStatisticsBucket(day, (date) => {
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  });
  const month = mockStatisticsBucket(day, (date) =>
    date.toISOString().slice(0, 7),
  );
  const quarter = mockStatisticsBucket(
    day,
    (date) =>
      `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`,
  );
  const year = mockStatisticsBucket(day, (date) =>
    String(date.getUTCFullYear()),
  );
  return {
    day: mockStatisticsBundle(day, `Daily activity for ${range}`),
    week: mockStatisticsBundle(week, `Weekly activity for ${range}`),
    month: mockStatisticsBundle(month, `Monthly activity for ${range}`),
    quarter: mockStatisticsBundle(quarter, `Quarterly activity for ${range}`),
    year: mockStatisticsBundle(year, `Annual activity for ${range}`),
  };
}

/** Extended summary for `/dashboard/summary` (backward compatible). */
export function buildDashboardSummaryExtended(): DashboardSummaryResponse {
  const now = new Date();
  const buckets = buildWithdrawBuckets(now);
  const all = mockConversions.filter(isDashboardConversion);
  const { count, payout, sale } = sumConversions(all);
  const win = rangeWindow("30d", now);
  let priorPeriod: DashboardSummaryResponse["priorPeriod"];
  if (win.prior) {
    const p = filterConversions(all, win.prior.from, win.prior.to);
    const pS = sumConversions(p);
    priorPeriod = {
      conversionCount: pS.count,
      conversionTotalPayout: Math.round(pS.payout * 100) / 100,
      conversionTotalSaleAmount: Math.round(pS.sale * 100) / 100,
    };
  }
  return {
    currency: "THB",
    conversionCount: count,
    conversionTotalPayout: Math.round(payout * 100) / 100,
    conversionTotalSaleAmount: Math.round(sale * 100) / 100,
    period: { from: iso(win.current.from), to: iso(win.current.to) },
    lastUpdated: iso(now),
    withdrawByStatus: buckets,
    priorPeriod,
  };
}

export function buildDashboardInsights(
  searchParams: URLSearchParams,
): DashboardInsightsResponse {
  const range = parseRangeParam(searchParams.get("range"));
  const now = new Date();
  const win = rangeWindow(range, now);
  const dashboardConversions = mockConversions.filter(isDashboardConversion);

  const conversionsInPeriod =
    win.prior === null
      ? [...dashboardConversions]
      : filterConversions(
          [...dashboardConversions],
          win.current.from,
          win.current.to,
        );

  const kpis = buildKpiBlock([...dashboardConversions], win, win.current.from);

  const buckets = buildWithdrawBuckets(now);
  const wm = withdrawMetrics(buckets, now);
  const ratio =
    kpis.current.conversionTotalSaleAmount > 0
      ? kpis.current.conversionTotalPayout /
        kpis.current.conversionTotalSaleAmount
      : null;

  const health = commissionHealth();
  const baseAlerts = buildAlerts(kpis, buckets, wm, health);
  const stats = statisticsFromConversions(conversionsInPeriod, range);
  const quests = buildQuestMetrics(now, win, conversionsInPeriod);
  const questAlerts = buildQuestAlerts(quests.rows);
  const alerts = sortAlertsBySeverity([...baseAlerts, ...questAlerts]);

  const summaryText = insightSentence(kpis, buckets, ratio, quests);

  return {
    lastUpdated: iso(now),
    range,
    currency: "THB",
    availability: MOCK_DASHBOARD_AVAILABILITY,
    period: { from: iso(win.current.from), to: iso(win.current.to) },
    kpis,
    withdrawByStatus: buckets,
    withdrawMetrics: wm,
    conversionsByStatus: conversionsByStatus(conversionsInPeriod),
    payoutRatio: ratio != null ? Math.round(ratio * 100_000) / 100_000 : null,
    topOffers: topOffers(conversionsInPeriod, 8),
    networkBreakdown: networkBreakdown(conversionsInPeriod),
    commissionHealth: health,
    alerts,
    insightSummary: summaryText,
    statistics: stats,
    quests,
  };
}
