/**
 * Single source of truth for the executive dashboard (mock).
 *
 * TODO: Replace with API layer — e.g. GET /api/executive/summary that returns this shape.
 * Suggested services: warehouse + event stream aggregated daily; refresh hourly for exec view.
 */

import type {
  ChannelMixRow,
  CohortCell,
  ExecutiveAlert,
  ExecutiveFilters,
  FunnelStage,
  KpiTarget,
  LeaderboardRow,
  MerchantPartner,
  RevenueWaterfallStep,
  RoadmapMilestone,
  TrendPoint,
  VerticalSplit,
} from "./types";

/** headline numbers aligned with reported traction: ~2M users, $6M GMV context, 110+ partners */
export const EXEC_OVERVIEW_KPIS = {
  totalUsers: 2_040_000,
  monthlyActiveUsers: 812_000,
  gmvUsd: 6_200_000,
  netRevenueUsd: 428_000,
  totalTransactions: 94_200,
  merchantIntegrations: 54,
  activePartners: 118,
  cashbackIssuedUsd: 1_240_000,
  monthlyGrowthRatePct: 4.2,
  conversionFirstTxPct: 18.6,
  repeatTransactionRatePct: 41.2,
  annualTargetProgressPct: 67,
} as const;

export const NEW_USERS_TREND: TrendPoint[] = [
  { label: "W1", value: 42000 },
  { label: "W2", value: 45800 },
  { label: "W3", value: 44100 },
  { label: "W4", value: 50200 },
];

export const ACQUISITION_FUNNEL: FunnelStage[] = [
  { id: "visit", label: "Site / app visits", count: 8_400_000, rateFromPrev: 100 },
  { id: "signup", label: "Signups", count: 1_020_000, rateFromPrev: 12.1 },
  { id: "wallet", label: "Wallet activated", count: 640_000, rateFromPrev: 62.7 },
  { id: "first_tx", label: "First transaction", count: 380_000, rateFromPrev: 59.4 },
  { id: "repeat", label: "Repeat (30d)", count: 156_000, rateFromPrev: 41.1 },
];

export const CHANNEL_MIX: ChannelMixRow[] = [
  { channel: "Organic / brand", users: 890_000, pct: 43.6 },
  { channel: "Referral", users: 512_000, pct: 25.1 },
  { channel: "Paid social", users: 318_000, pct: 15.6 },
  { channel: "Partners", users: 220_000, pct: 10.8 },
  { channel: "Other", users: 100_000, pct: 4.9 },
];

export const GMV_TREND: TrendPoint[] = [
  { label: "Jan", value: 4_100_000 },
  { label: "Feb", value: 4_450_000 },
  { label: "Mar", value: 4_900_000 },
  { label: "Apr", value: 5_200_000 },
  { label: "May", value: 5_650_000 },
  { label: "Jun", value: 6_200_000 },
];

export const REVENUE_WATERFALL: RevenueWaterfallStep[] = [
  { label: "Gross affiliate commission", value: 1_850_000, type: "start" },
  { label: "Platform take (10%)", value: 185_000, type: "positive" },
  { label: "Advertising", value: 96_000, type: "positive" },
  { label: "Premium ($1.49+)", value: 72_000, type: "positive" },
  { label: "B2B insights", value: 48_000, type: "positive" },
  { label: "Cashback & ops allocation", value: -973_000, type: "negative" },
  { label: "Net revenue (operating)", value: 428_000, type: "end" },
];

export const DAU_WAU_MAU = { dau: 214_000, wau: 510_000, mau: 812_000, stickiness: 0.264 };

export const COHORT_RETENTION: CohortCell[] = [
  { period: "2025-10", w0: 100, w1: 42, w2: 31, w3: 26, w4: 22 },
  { period: "2025-11", w0: 100, w1: 44, w2: 33, w3: 28, w4: 24 },
  { period: "2025-12", w0: 100, w1: 46, w2: 35, w3: 29, w4: 25 },
  { period: "2026-01", w0: 100, w1: 48, w2: 36, w3: 30, w4: 21 },
];

export const MERCHANTS: MerchantPartner[] = [
  {
    id: "m1",
    name: "TravelHub Global",
    category: "Travel",
    gmv: 1_120_000,
    transactions: 18200,
    conversionRate: 6.8,
    cashbackCost: 224_000,
    country: "TH",
  },
  {
    id: "m2",
    name: "ElectroMax",
    category: "Electronics",
    gmv: 890_000,
    transactions: 24100,
    conversionRate: 5.2,
    cashbackCost: 178_000,
    country: "TH",
  },
  {
    id: "m3",
    name: "Glow Beauty",
    category: "Health & beauty",
    gmv: 410_000,
    transactions: 19800,
    conversionRate: 7.9,
    cashbackCost: 82_000,
    country: "TH",
  },
  {
    id: "m4",
    name: "HomeNest",
    category: "Home",
    gmv: 360_000,
    transactions: 12400,
    conversionRate: 4.4,
    cashbackCost: 72_000,
    country: "TH",
  },
  {
    id: "m5",
    name: "EduPlus",
    category: "Education",
    gmv: 220_000,
    transactions: 9100,
    conversionRate: 5.9,
    cashbackCost: 44_000,
    country: "TH",
  },
];

export const VERTICAL_SPLIT: VerticalSplit[] = [
  { vertical: "Travel", gmv: 1_450_000, partners: 22, pct: 23.4 },
  { vertical: "Electronics", gmv: 1_210_000, partners: 28, pct: 19.5 },
  { vertical: "Health & beauty", gmv: 980_000, partners: 19, pct: 15.8 },
  { vertical: "Home", gmv: 890_000, partners: 15, pct: 14.4 },
  { vertical: "Education", gmv: 520_000, partners: 12, pct: 8.4 },
  { vertical: "Other", gmv: 1_150_000, partners: 22, pct: 18.5 },
];

export const OPS_HEALTH = {
  cashbackSuccessRate: 97.2,
  delayedCashback: 1840,
  failedCashback: 312,
  ticketsOpened: 4280,
  avgFirstResponseMin: 12,
  avgResolutionHrs: 6.2,
  slaCompliancePct: 94.5,
  aiContainmentPct: 61,
  uptimePct: 99.95,
  releases30d: 14,
  openBugs: { p0: 1, p1: 4, p2: 18 },
};

export const ROADMAP: RoadmapMilestone[] = [
  {
    id: "m1",
    code: "M1",
    title: "Prototype & pilot",
    window: "Jan – Mar 2026",
    status: "in_progress",
    progressPct: 72,
    bullets: [
      "Prototype development",
      "Pilot testing",
      "First partner negotiation",
      "Preliminary report",
    ],
  },
  {
    id: "m2",
    code: "M2",
    title: "Hardening & scale prep",
    window: "Apr – Jun 2026",
    status: "planned",
    progressPct: 18,
    bullets: [
      "System improvements & QA",
      "Additional partner connections",
      "First marketing campaign",
      "Mid-year report",
    ],
  },
  {
    id: "m3",
    code: "M3",
    title: "Full launch & expansion",
    window: "Jul 2026+",
    status: "planned",
    progressPct: 5,
    bullets: [
      "Full launch & market expansion",
      "Cashback & quest full activation",
      "Strategic partners & seasonal campaigns",
      "Summary metrics reports",
    ],
  },
];

export const STRATEGIC_TARGETS: KpiTarget[] = [
  { id: "u1m", label: "Users (1M milestone)", target: 1_000_000, current: 2_040_000, unit: "count" },
  { id: "tx100k", label: "Transactions (100k)", target: 100_000, current: 94_200, unit: "count" },
  { id: "merc50", label: "Merchant integrations (50)", target: 50, current: 54, unit: "count" },
];

export const ALERTS: ExecutiveAlert[] = [
  {
    id: "a1",
    severity: "warning",
    title: "First-tx conversion below target",
    detail: "18.6% vs 22% Q2 goal — wallet activation drop in paid social cohort.",
    metric: "conversion_first_tx",
    timestamp: "2026-03-29T14:00:00Z",
  },
  {
    id: "a2",
    severity: "critical",
    title: "P0 payout reconciliation",
    detail: "312 failed cashback events in last 7d — ops war-room active.",
    metric: "failed_cashback",
    timestamp: "2026-03-30T08:12:00Z",
  },
  {
    id: "a3",
    severity: "info",
    title: "M1 milestone pacing",
    detail: "Pilot cohort NPS proxy +6 vs prior month — keep support SLA focus.",
    metric: "nps_proxy",
    timestamp: "2026-03-28T09:30:00Z",
  },
];

export const ENGAGEMENT_METRICS = {
  questParticipationPct: 28.4,
  cashbackRedemptionPct: 76.2,
  avgSessionsPerWeek: 3.1,
  npsProxy: 42,
  churnRiskFlags: 12400,
};

export const UNIT_ECONOMICS = {
  blendedTakeRatePct: 2.9,
  arpuUsd: 0.52,
  ltvUsd: 48,
  cacUsd: 6.2,
  paybackMonths: 4.1,
  referralContributionPct: 25.1,
  cpaUsd: 5.4,
};

/**
 * Lightweight client-side filter demo — real impl would pass filters to API.
 */
export function applyExecutiveFilters(filters: ExecutiveFilters) {
  void filters;
  return {
    overview: EXEC_OVERVIEW_KPIS,
    newUsersTrend: NEW_USERS_TREND,
    funnel: ACQUISITION_FUNNEL,
    channelMix: CHANNEL_MIX,
    gmvTrend: GMV_TREND,
    revenueWaterfall: REVENUE_WATERFALL,
    dauWauMau: DAU_WAU_MAU,
    cohorts: COHORT_RETENTION,
    merchants: MERCHANTS,
    verticals: VERTICAL_SPLIT,
    ops: OPS_HEALTH,
    roadmap: ROADMAP,
    targets: STRATEGIC_TARGETS,
    alerts: ALERTS,
    engagement: ENGAGEMENT_METRICS,
    unitEconomics: UNIT_ECONOMICS,
  };
}
