import { NextResponse } from "next/server";
import { z } from "zod";
import { createBreachLog, listBreaches } from "@/lib/pdpa/breachService";
import { generatePDPCNotification } from "@/lib/pdpa/breachTemplate";

export const runtime = "nodejs";

const adminSecret = () => process.env.PDPA_CRON_SECRET ?? process.env.PDPA_ADMIN_SECRET;

function authorize(req: Request): boolean {
  const secret = adminSecret();
  if (!secret) return process.env.NODE_ENV === "development";
  const h = req.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const breaches = await listBreaches();
  return NextResponse.json({ breaches });
}

const postSchema = z.object({
  detectedAt: z.string().datetime(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedUsers: z.number().int().min(0),
  dataCategories: z.array(z.string()),
  description: z.string(),
  rootCause: z.string(),
  userNotificationRequired: z.boolean(),
});

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const breach = await createBreachLog(parsed.data);
  const draft = generatePDPCNotification(breach);
  return NextResponse.json({ breach, pdpcDraft: draft });
}
