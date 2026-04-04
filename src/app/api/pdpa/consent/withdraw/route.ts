import { NextResponse } from "next/server";
import { z } from "zod";
import { appendWithdrawalConsent } from "@/lib/pdpa/consentService";
import { hashIp } from "@/lib/pdpa/hash";
import { getPdpaSalt } from "@/lib/pdpa/fileStore";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";
import { PURPOSE_CODES, type PurposeCode } from "@/lib/pdpa/constants";

export const runtime = "nodejs";

const purposeCodeSchema = z
  .string()
  .refine(
    (p): p is PurposeCode => (PURPOSE_CODES as readonly string[]).includes(p),
    "invalid purposeCode"
  );

const bodySchema = z.object({
  purposeCodes: z.array(purposeCodeSchema).min(1),
  method: z.string().min(1),
});

export async function POST(req: Request) {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const salt = getPdpaSalt();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = req.headers.get("user-agent") ?? "";

  const row = await appendWithdrawalConsent(
    userId,
    parsed.data.purposeCodes,
    parsed.data.method,
    hashIp(ip, salt),
    hashIp(ua.slice(0, 500), salt)
  );

  return NextResponse.json({ consentRecord: row });
}
