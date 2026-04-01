/**
 * Server-only Stripe module — use `getStripe()` for null-safe access.
 */
import { getStripe } from "./getStripe";

export { getStripe } from "./getStripe";
export { handleStripeWebhookPost } from "./handleStripeWebhook";
export { resolveStarterPlanPriceId } from "./resolveStarterPlanPriceId";

export const stripe = getStripe();
