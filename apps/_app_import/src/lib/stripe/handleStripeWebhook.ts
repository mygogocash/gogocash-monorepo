import { env } from "@/env";
import { getStripe } from "@/lib/stripe/getStripe";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * In-memory idempotency for duplicate deliveries (single Node instance).
 * Keyed after successful handling so Stripe retries can re-run failed work.
 */
const processedEventIds = new Set<string>();
const MAX_IDS = 5000;

function trimIdSet(): void {
  if (processedEventIds.size > MAX_IDS) {
    processedEventIds.clear();
  }
}

async function syncSubscriptionToBackend(event: Stripe.Event): Promise<void> {
  const base = env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) {
    return;
  }
  try {
    await fetch(`${base}/internal/stripe/subscription-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: event.type, id: event.id }),
    });
  } catch (err) {
    Sentry.captureException(err);
  }
}

export async function handleStripeWebhookPost(request: Request): Promise<Response> {
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

  if (processedEventIds.has(event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
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
            /* non-fatal */
          }
        }
        await syncSubscriptionToBackend(event);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid":
      case "invoice.payment_failed":
        await syncSubscriptionToBackend(event);
        break;
      default:
        break;
    }
  } catch (err) {
    Sentry.captureException(err);
  }

  processedEventIds.add(event.id);
  trimIdSet();

  Sentry.addBreadcrumb({
    category: "stripe.webhook",
    message: `${event.type} ${event.id}`,
    level: "info",
  });

  return NextResponse.json({ received: true });
}
