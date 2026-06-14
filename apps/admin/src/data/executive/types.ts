/**
 * Executive dashboard domain types.
 * Replace / extend when wiring to real APIs — keep shapes stable for UI components.
 */

export type DateRangePreset = "7d" | "30d" | "90d" | "ytd";

export type ExecutiveFilters = {
  range: DateRangePreset;
  country: string;
  merchantCategory: string;
  channel: string;
};

export type TrendPoint = { label: string; value: number; value2?: number };

export type FunnelStage = { id: string; label: string; count: number; rateFromPrev?: number };

export type LeaderboardRow = {
  rank: number;
  name: string;
  primary: string;
  secondary?: string;
  trend?: "up" | "down" | "flat";
};

export type ExecutiveAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  metric?: string;
  timestamp: string;
};

export type RoadmapMilestone = {
  id: string;
  code: "M1" | "M2" | "M3";
  title: string;
  window: string;
  status: "complete" | "in_progress" | "planned";
  progressPct: number;
  bullets: string[];
};

export type KpiTarget = {
  id: string;
  label: string;
  target: number;
  current: number;
  unit: "count" | "usd" | "percent";
};

export type CohortCell = { period: string; w0: number; w1: number; w2: number; w3: number; w4: number };

export type MerchantPartner = {
  id: string;
  name: string;
  category: string;
  gmv: number;
  transactions: number;
  conversionRate: number;
  cashbackCost: number;
  country: string;
};

export type RevenueWaterfallStep = { label: string; value: number; type: "start" | "positive" | "negative" | "end" };

export type ChannelMixRow = { channel: string; users: number; pct: number };

export type VerticalSplit = { vertical: string; gmv: number; partners: number; pct: number };
