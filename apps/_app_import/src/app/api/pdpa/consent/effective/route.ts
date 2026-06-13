import { NextResponse } from "next/server";
import { getLatestGrantMap, isPurposeGranted } from "@/lib/pdpa/consentService";
import { readPdpaStore } from "@/lib/pdpa/fileStore";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";
import { PURPOSE_CODES, type PurposeCode } from "@/lib/pdpa/constants";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const doc = await readPdpaStore();
  const map = getLatestGrantMap(doc.consentRecords, userId);
  const purposes: Record<string, { granted: boolean; lastGrantedAt: string | null }> = {};
  for (const code of PURPOSE_CODES) {
    if (isPurposeGranted(doc.consentRecords, userId, code)) {
      const date = map.get(code);
      purposes[code] = { granted: true, lastGrantedAt: date ? date.toISOString() : null };
    }
  }
  return NextResponse.json({
    purposes: purposes as Partial<
      Record<PurposeCode, { granted: boolean; lastGrantedAt: string | null }>
    >,
  });
}
