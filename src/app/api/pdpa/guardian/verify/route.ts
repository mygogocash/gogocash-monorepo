import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGuardianToken } from "@/lib/pdpa/minorService";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(10),
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
  const ok = await verifyGuardianToken(userId, parsed.data.token);
  if (!ok) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }
  return NextResponse.json({ verified: true });
}
