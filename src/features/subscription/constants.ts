export const PLANS = {
  thb_monthly_49: {
    id: "thb_monthly_49" as const,
    name: "GoGo Unlimited",
    priceTHB: 49,
    interval: "month" as const,
    stripePriceEnvKey: "STRIPE_PRICE_THB_MONTHLY",
  },
  thb_annual_490: {
    id: "thb_annual_490" as const,
    name: "GoGo Unlimited Annual",
    priceTHB: 490,
    effectiveMonthlyTHB: 41,
    savingsPct: 16,
    interval: "year" as const,
    stripePriceEnvKey: "STRIPE_PRICE_THB_ANNUAL",
  },
} as const;
