// Temporary app-level switches for incomplete features.
export const FEATURE_FLAGS = {
  subscription: false,
  /**
   * Stripe Checkout on membership + related API routes.
   * Set `NEXT_PUBLIC_STRIPE_BILLING=1` and configure server `STRIPE_*` env vars.
   */
  stripeBilling: typeof process !== "undefined" && process.env.NEXT_PUBLIC_STRIPE_BILLING === "1",
} as const;
