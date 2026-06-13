import { handleStripeWebhookPost } from "@/lib/stripe/handleStripeWebhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** @deprecated Prefer `POST /api/webhooks/stripe` for new Stripe Dashboard endpoints. */
export async function POST(request: Request) {
  return handleStripeWebhookPost(request);
}
