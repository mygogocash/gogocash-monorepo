/**
 * Stripe webhooks — verify signature and relay subscription events.
 *
 * Local testing (Stripe CLI):
 * 1. `npm install -g stripe` (or `pnpm add -g stripe`) — Stripe CLI
 * 2. `stripe login`
 * 3. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 * 4. Copy the webhook signing secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`
 * 5. In Stripe Dashboard (test mode): create products/prices → copy Price IDs into `.env.local`
 * 6. Checkout: sign in → `/pricing` → Subscribe → test card `4242 4242 4242 4242`
 * 7. Cancel: `/billing` → Manage Subscription
 * 8. Payment failure: test card `4000 0000 0000 0341` → `invoice.payment_failed`
 */
import { handleStripeWebhookPost } from "@/lib/stripe/handleStripeWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleStripeWebhookPost(request);
}
