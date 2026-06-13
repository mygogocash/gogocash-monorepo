import { createHash } from "node:crypto";

/**
 * Hash identifiers for audit/consent logs (never store raw IP in logs per PDPA hygiene).
 */
export function sha256Hex(input: string, salt?: string): string {
  const h = createHash("sha256");
  h.update(salt ?? "");
  h.update(input);
  return h.digest("hex");
}

export function hashIp(ip: string | undefined, salt: string): string {
  if (!ip) return "";
  return sha256Hex(ip.trim(), salt);
}
