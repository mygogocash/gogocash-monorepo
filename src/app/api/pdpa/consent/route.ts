import { NextResponse } from "next/server";
import { z } from "zod";
import { appendConsentRecord, listConsentRecords } from "@/lib/pdpa/consentService";
import { hashIp } from "@/lib/pdpa/hash";
import { getPdpaSalt } from "@/lib/pdpa/fileStore";
import { getPdpaSessionUserId } from "@/lib/pdpa/session";
import { PURPOSE_CODES, type PurposeCode } from "@/lib/pdpa/constants";
import { logDataAccess } from "@/lib/pdpa/auditService";

export const runtime = "nodejs";

const purposeCodeSchema = z
  .string()
  .refine(
    (p): p is PurposeCode => (PURPOSE_CODES as readonly string[]).includes(p),
    "invalid purposeCode"
  );

const bodySchema = z.object({
  purposes: z.array(
    z.object({
      purposeCode: purposeCodeSchema,
      granted: z.boolean(),
      consentText: z.string().min(1),
    })
  ),
  method: z.enum([
    "IN_APP_ONBOARDING",
    "SETTINGS_UPDATE",
    "EMAIL_LINK",
    "GUARDIAN_CONSENT",
    "LEGACY_MIGRATION",
  ]),
  isMinor: z.boolean().optional(),
  ageAtConsent: z.number().nullable().optional(),
});

export async function GET() {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const rows = await listConsentRecords(userId);
  return NextResponse.json({ consentRecords: rows });
}

export async function POST(req: Request) {
  const userId = await getPdpaSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_BODY", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const salt = getPdpaSalt();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = req.headers.get("user-agent") ?? "";
  const ipHash = hashIp(ip, salt);
  const fpHash = hashIp(ua.slice(0, 500), salt);

  const row = await appendConsentRecord({
    userId,
    purposes: parsed.data.purposes,
    method: parsed.data.method,
    ipAddressHashed: ipHash,
    deviceFingerprintHashed: fpHash,
    isMinor: parsed.data.isMinor ?? false,
    ageAtConsent: parsed.data.ageAtConsent ?? null,
    guardianConsent: null,
  });

  await logDataAccess({
    userId,
    accessedBy: "USER_SELF",
    action: "CREATE",
    dataCategories: ["consent"],
    purpose: "consent_record",
    ipAddressHashed: ipHash,
    userAgent: ua,
    endpoint: "/api/pdpa/consent",
    responseStatus: 200,
    authorized: true,
    authorizationBasis: "self_service",
  });

  return NextResponse.json({ consentRecord: row });
}
