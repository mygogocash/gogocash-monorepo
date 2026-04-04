"use server";

import { authOptions } from "@/lib/authFirebase";
import { env } from "@/env";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { getStripe } from "@/lib/stripe/getStripe";
import { resolveStarterPlanPriceId } from "@/lib/stripe/resolveStarterPlanPriceId";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import type Stripe from "stripe";
import type { PlanId, SubscriptionState, SubscriptionStatus } from "./types";

function emptySubscriptionState(): SubscriptionState {
  return {
    status: "none",
    planId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

async function absoluteOrigin(): Promise<string> {
  const fromEnv = env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function planIdFromPriceId(priceId: string | undefined): PlanId | null {
  if (!priceId) return null;
  const monthly = env.STRIPE_PRICE_STARTER_MONTHLY;
  const annual = env.STRIPE_PRICE_STARTER_ANNUAL ?? env.STRIPE_PRICE_STARTER_YEARLY;
  if (monthly && priceId === monthly) return "starter_monthly";
  if (annual && priceId === annual) return "starter_annual";
  return null;
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "none";
  }
}

export async function getUserSubscription(): Promise<SubscriptionState> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return emptySubscriptionState();
  }

  const stripe = getStripe();
  if (!stripe) {
    return emptySubscriptionState();
  }

  const userId = session.user._id ? String(session.user._id) : undefined;
  try {
    const customers = await stripe.customers.list({ email, limit: 10 });
    const customer =
      (userId ? customers.data.find((c) => c.metadata?.gogocash_user_id === userId) : undefined) ??
      customers.data[0];

    if (!customer) {
      return emptySubscriptionState();
    }

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    const pick =
      subs.data.find((s) => s.status === "active" || s.status === "trialing") ??
      subs.data.find((s) => s.status === "past_due") ??
      subs.data[0];

    if (!pick) {
      return {
        ...emptySubscriptionState(),
        stripeCustomerId: customer.id,
      };
    }

    const priceId = pick.items.data[0]?.price?.id;
    const periodEndSec = pick.current_period_end;
    return {
      status: mapStripeSubscriptionStatus(pick.status),
      planId: planIdFromPriceId(priceId),
      currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000) : null,
      cancelAtPeriodEnd: pick.cancel_at_period_end,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: pick.id,
    };
  } catch {
    return emptySubscriptionState();
  }
}

export async function createCheckoutSession(
  planId: PlanId,
  locale: "en" | "th"
): Promise<{ url: string }> {
  if (!FEATURE_FLAGS.stripeBilling) {
    throw new Error("Stripe billing is disabled");
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    throw new Error("Unauthorized");
  }

  const priceId = resolveStarterPlanPriceId(planId);
  if (!priceId) {
    throw new Error("Price is not configured for this plan. Set STRIPE_PRICE_* env vars.");
  }

  const origin = await absoluteOrigin();
  const userId = session.user._id ?? session.user.email ?? "";
  const successUrl = `${origin}/${locale}/billing?success=true`;
  const cancelUrl = `${origin}/${locale}/pricing?checkout=cancel`;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: String(userId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      gogocash_user_id: String(userId),
      plan_id: planId,
    },
    subscription_data: {
      metadata: {
        gogocash_user_id: String(userId),
        plan_id: planId,
      },
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Checkout session missing redirect URL");
  }

  return { url: checkoutSession.url };
}

export async function createBillingPortalSession(locale: "en" | "th"): Promise<{ url: string }> {
  if (!FEATURE_FLAGS.stripeBilling) {
    throw new Error("Stripe billing is disabled");
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    throw new Error("Unauthorized");
  }

  const userId = session.user._id ? String(session.user._id) : undefined;
  const customers = await stripe.customers.list({ email, limit: 10 });
  const customer =
    (userId ? customers.data.find((c) => c.metadata?.gogocash_user_id === userId) : undefined) ??
    customers.data[0];

  if (!customer) {
    throw new Error("No Stripe customer found. Subscribe from pricing first.");
  }

  const origin = await absoluteOrigin();
  const returnUrl = `${origin}/${locale}/billing`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  if (!portal.url) {
    throw new Error("Billing portal missing URL");
  }

  return { url: portal.url };
}
