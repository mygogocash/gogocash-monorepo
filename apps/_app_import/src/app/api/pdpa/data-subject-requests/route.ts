import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAccessExport,
  createDataSubjectRequest,
  listRequestsForUser,
} from "@/lib/pdpa/dataSubjectRightsService";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";

export const runtime = "nodejs";

const types = z.enum([
  "ACCESS",
  "PORTABILITY",
  "OBJECTION",
  "ERASURE",
  "RESTRICTION",
  "RECTIFICATION",
  "WITHDRAW_CONSENT",
  "HUMAN_REVIEW",
]);

const bodySchema = z.object({
  requestType: types,
  channel: z.enum(["IN_APP", "EMAIL", "INTERCOM_TICKET"]).default("IN_APP"),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const requests = await listRequestsForUser(userId);
  return NextResponse.json({ requests });
}

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

  const row = await createDataSubjectRequest({
    userId,
    requestType: parsed.data.requestType,
    channel: parsed.data.channel,
    payload: parsed.data.payload,
  });

  if (parsed.data.requestType === "ACCESS" || parsed.data.requestType === "PORTABILITY") {
    const exportJson = await buildAccessExport(userId);
    return NextResponse.json({
      request: row,
      /** Preview bundle — production must attach full backend export */
      dataPreview: exportJson,
    });
  }

  return NextResponse.json({ request: row });
}
