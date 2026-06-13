import { authOptions } from "@/lib/authFirebase";
import { env } from "@/env";
import { getStripe } from "@/lib/stripe/getStripe";
import { FEATURE_FLAGS } from "@/constants/featureFlags";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
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

  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    /* empty body */
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { locale } = parsed.data;

  const userId = session.user._id ? String(session.user._id) : undefined;
  const customers = await stripe.customers.list({ email, limit: 10 });
  const customer =
    (userId ? customers.data.find((c) => c.metadata?.gogocash_user_id === userId) : undefined) ??
    customers.data[0];

  if (!customer) {
    return NextResponse.json(
      { error: "No Stripe customer found for this account. Subscribe once from membership first." },
      { status: 404 }
    );
  }

  const origin = absoluteOrigin(request);
  const returnUrl = `${origin}/${locale}/membership`;

  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: portal.url });
}
