import Stripe from "stripe";

import { env } from "@/env";

let stripe: Stripe | null | undefined;

/**
 * Returns a Stripe SDK instance when `STRIPE_SECRET_KEY` is set; otherwise `null`.
 * Server-only (do not import from client components).
 */
export function getStripe(): Stripe | null {
  if (stripe !== undefined) {
    return stripe;
  }
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    stripe = null;
    return stripe;
  }
  stripe = new Stripe(key);
  return stripe;
}
