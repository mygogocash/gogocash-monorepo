import { NextResponse } from "next/server";
import { readPdpaStore } from "@/lib/pdpa/fileStore";

export const runtime = "nodejs";

export async function GET() {
  const doc = await readPdpaStore();
  return NextResponse.json({ dataTransferAgreements: doc.dataTransferAgreements });
}
