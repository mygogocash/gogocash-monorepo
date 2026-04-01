import { authOptions } from "@/lib/authFirebase";
import { env } from "@/env";
import {
  resolveStripePriceId,
  type StripeBillingInterval,
  type StripePlanTier,
} from "@/lib/stripe/resolveStripePriceId";
import { getStripe } from "@/lib/stripe/getStripe";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tier: z.enum(["starter", "plus", "pro"]),
  interval: z.enum(["month", "year"]),
  locale: z.enum(["en", "th"]).optional().default("en"),
});

function absoluteOrigin(request: Request): string {
  const fromEnv = env.NEXT_PUBLIC_FRONTEND_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export async function POST(request: Request) {
  if (!FEATURE_FLAGS.stripeBilling) {
    return NextResponse.json({ error: "Stripe billing is disabled" }, { status: 403 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tier, interval, locale } = parsed.data;
  const priceId = resolveStripePriceId(tier as StripePlanTier, interval as StripeBillingInterval);
  if (!priceId) {
    return NextResponse.json(
      { error: "Price is not configured for this plan. Set STRIPE_PRICE_* env vars." },
      { status: 503 }
    );
  }

  const origin = absoluteOrigin(request);
  const userId = session.user._id ?? session.user.email ?? "";
  const successUrl = `${origin}/${locale}/membership?checkout=success`;
  const cancelUrl = `${origin}/${locale}/membership?checkout=cancel`;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    client_reference_id: String(userId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      gogocash_user_id: String(userId),
      tier,
      interval,
    },
    subscription_data: {
      metadata: {
        gogocash_user_id: String(userId),
        tier,
        interval,
      },
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json({ error: "Checkout session missing redirect URL" }, { status: 500 });
  }

  return NextResponse.json({ url: checkoutSession.url });
}
