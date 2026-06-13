import type { PurposeCode } from "./constants";
import { isPurposeGranted } from "./consentService";
import { readPdpaStore } from "./fileStore";
import type { SessionUserId } from "./session";

const MESSAGE = "Consent required for this processing purpose (PDPA).";

/** Returns a Response when consent is missing or stale; otherwise null. Use HTTP 451 as in spec. */
export async function requireConsentOrThrowResponse(
  userId: SessionUserId,
  purpose: PurposeCode
): Promise<Response | null> {
  const doc = await readPdpaStore();
  if (!isPurposeGranted(doc.consentRecords, userId, purpose)) {
    return new Response(
      JSON.stringify({
        error: "CONSENT_REQUIRED",
        purpose,
        message: MESSAGE,
      }),
      {
        status: 451,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
  return null;
}

export function pdpaContext(userId: SessionUserId, purpose: PurposeCode) {
  return {
    userId,
    consentedPurposes: [purpose],
    legalBasis: purpose,
  };
}
