export const PLANS = {
  starter_monthly: {
    id: "starter_monthly" as const,
    name: "GoGo Unlimited",
    priceUsd: 1.49,
    priceTHBDisplay: 52.15,
    interval: "month" as const,
    stripePriceEnvKey: "STRIPE_PRICE_STARTER_MONTHLY",
  },
  starter_annual: {
    id: "starter_annual" as const,
    name: "GoGo Unlimited Annual",
    priceUsd: 14.9,
    priceTHBDisplay: 521.5,
    effectiveMonthlyUsd: 1.24,
    effectiveMonthlyTHB: 43.46,
    savingsPct: 16.7,
    interval: "year" as const,
    stripePriceEnvKey: "STRIPE_PRICE_STARTER_ANNUAL",
  },
} as const;

/** THB display uses 1 USD = 35 THB (UI reference only). */
export const USD_TO_THB_DISPLAY = 35;
