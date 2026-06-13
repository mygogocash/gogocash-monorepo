import { NextResponse } from "next/server";
import { readPdpaStore } from "@/lib/pdpa/fileStore";

export const runtime = "nodejs";

function authorize(req: Request): boolean {
  const secret = process.env.PDPA_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Merchant DPA tracking stub — extend with merchant collection. */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const doc = await readPdpaStore();
  return NextResponse.json({
    summary: {
      transferAgreements: doc.dataTransferAgreements.length,
      active: doc.dataTransferAgreements.filter((t) => t.status === "ACTIVE").length,
    },
    note: "Merchant-specific DPA rows require merchant database — template in legal/dpa-merchant-template.md",
  });
}
