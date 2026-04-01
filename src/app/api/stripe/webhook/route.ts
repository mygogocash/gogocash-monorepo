import { env } from "@/env";
import { getStripe } from "@/lib/stripe/getStripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhooks — verify signature and handle subscription lifecycle.
 * Entitlements should ultimately be updated by your GoGoCash API; this handler
 * acknowledges events and is safe to extend with forwarding or queue jobs.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      const uid = session.metadata?.gogocash_user_id;
      if (customerId && uid) {
        try {
          await stripe.customers.update(customerId, {
            metadata: { gogocash_user_id: uid },
          });
        } catch {
          /* non-fatal — portal can still match by email */
        }
      }
      if (process.env.NODE_ENV === "development") {
        console.info("[stripe webhook]", event.type, event.id);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      if (process.env.NODE_ENV === "development") {
        console.info("[stripe webhook]", event.type, event.id);
      }
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
