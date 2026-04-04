import { NextResponse } from "next/server";
import { runRetentionPurgeJob } from "@/lib/pdpa/retentionPurgeService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.PDPA_CRON_SECRET;
  if (secret) {
    const h = req.headers.get("authorization");
    if (h !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "PDPA_CRON_SECRET_NOT_SET" }, { status: 503 });
  }

  const result = await runRetentionPurgeJob();
  return NextResponse.json(result);
}
