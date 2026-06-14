/**
 * KPI catalog: formula, business meaning, logical source, refresh cadence.
 * Use for tooltips, exports, and future data-contract alignment with backend.
 */

export type KpiDefinition = {
  id: string;
  name: string;
  formula: string;
  whyItMatters: string;
  sourceTable: string;
  updateFrequency: "realtime" | "hourly" | "daily" | "weekly";
};

export const EXECUTIVE_KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: "total_users",
    name: "Total users",
    formula: "COUNT(DISTINCT user_id) FROM users WHERE status = 'active'",
    whyItMatters: "Scale of reachable audience; anchor for growth and monetization ratios.",
    sourceTable: "users",
    updateFrequency: "daily",
  },
  {
    id: "mau",
    name: "Monthly active users",
    formula: "COUNT(DISTINCT user_id) FROM sessions WHERE session_date >= month_start",
    whyItMatters: "Engaged base; leading indicator for GMV and revenue durability.",
    sourceTable: "sessions",
    updateFrequency: "daily",
  },
  {
    id: "gmv",
    name: "GMV",
    formula: "SUM(transaction_amount_usd) FROM transactions WHERE status = 'completed'",
    whyItMatters: "Throughput through the platform; basis for take rate and partner leverage.",
    sourceTable: "transactions",
    updateFrequency: "hourly",
  },
  {
    id: "net_revenue",
    name: "Net revenue",
    formula: "SUM(revenue_amount) FROM revenue_events WHERE type IN ('affiliate_take','ads','premium','b2b') - allocated_ops",
    whyItMatters: "Cash-generating ability after cashback and operating allocations.",
    sourceTable: "revenue_events",
    updateFrequency: "daily",
  },
  {
    id: "transactions",
    name: "Total transactions",
    formula: "COUNT(*) FROM transactions WHERE status = 'completed'",
    whyItMatters: "Liquidity and habit formation; drives partner satisfaction.",
    sourceTable: "transactions",
    updateFrequency: "hourly",
  },
  {
    id: "merchant_integrations",
    name: "Merchant integrations",
    formula: "COUNT(*) FROM merchant_partners WHERE integration_status = 'live'",
    whyItMatters: "Supply depth and category coverage for user choice.",
    sourceTable: "merchant_partners",
    updateFrequency: "daily",
  },
  {
    id: "active_partners",
    name: "Active partners",
    formula: "COUNT(DISTINCT partner_id) FROM merchant_partners WHERE active_30d = true",
    whyItMatters: "Partner ecosystem health and diversification.",
    sourceTable: "merchant_partners",
    updateFrequency: "daily",
  },
  {
    id: "cashback_issued",
    name: "Cashback issued",
    formula: "SUM(amount_usd) FROM cashback_events WHERE state = 'issued'",
    whyItMatters: "User value delivered; balances against revenue and LTV.",
    sourceTable: "cashback_events",
    updateFrequency: "daily",
  },
  {
    id: "mom_growth",
    name: "Monthly growth rate",
    formula: "(MAU_current - MAU_prev) / MAU_prev",
    whyItMatters: "Momentum signal for board and fundraising narrative.",
    sourceTable: "sessions",
    updateFrequency: "weekly",
  },
  {
    id: "first_tx_conversion",
    name: "Conversion to first transaction",
    formula: "users_with_first_tx / wallet_activated_users",
    whyItMatters: "Activation quality; bottleneck for LTV and payback.",
    sourceTable: "users + transactions",
    updateFrequency: "daily",
  },
  {
    id: "repeat_tx_rate",
    name: "Repeat transaction rate",
    formula: "users_with_2plus_tx_30d / users_with_1plus_tx_30d",
    whyItMatters: "Retention proxy; correlates with habit and NPS.",
    sourceTable: "transactions",
    updateFrequency: "daily",
  },
  {
    id: "target_progress",
    name: "Progress vs annual targets",
    formula: "weighted_avg(actual_kpi / target_kpi) across KPI_targets",
    whyItMatters: "Single glance at operating plan execution.",
    sourceTable: "KPI_targets",
    updateFrequency: "weekly",
  },
];

export function getKpiDefinition(id: string): KpiDefinition | undefined {
  return EXECUTIVE_KPI_DEFINITIONS.find((k) => k.id === id);
}
