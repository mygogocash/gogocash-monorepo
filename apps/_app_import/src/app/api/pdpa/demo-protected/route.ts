import { NextResponse } from "next/server";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";
import { requireConsentOrThrowResponse, pdpaContext } from "@/lib/pdpa/requireConsent";
import type { PurposeCode } from "@/lib/pdpa/constants";

export const runtime = "nodejs";

/** Example: `GET /api/pdpa/demo-protected?purpose=B2B_DATA_AGGREGATION` */
export async function GET(req: Request) {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const purpose = (url.searchParams.get("purpose") ?? "CASHBACK_TRACKING") as PurposeCode;

  const denied = await requireConsentOrThrowResponse(userId, purpose);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    pdpaContext: pdpaContext(userId, purpose),
  });
}
