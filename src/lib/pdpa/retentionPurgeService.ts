import { randomUUID } from "node:crypto";
import { RETENTION_POLICY } from "./retentionPolicy";
import { withPdpaStore, readPdpaStore } from "./fileStore";

/**
 * Daily retention job — logs planned actions. Wire real deletes to your DB / vendor APIs in production.
 */
export async function runRetentionPurgeJob(): Promise<{ logged: number; summary: string[] }> {
  const summary: string[] = [];
  let logged = 0;

  await withPdpaStore(async (doc) => {
    const now = new Date().toISOString();
    for (const [key, rule] of Object.entries(RETENTION_POLICY)) {
      if (rule.action === "RETAIN_PERMANENTLY") {
        summary.push(`${key}: retain (consent/legal evidence)`);
        continue;
      }
      const line = `${key}: policy ${rule.action} after ${rule.retentionDays ?? "N/A"} days (${rule.trigger})`;
      summary.push(line);
      doc.purgeAuditLogs.push({
        id: randomUUID(),
        timestamp: now,
        category: key,
        action: rule.action,
        detail: line,
      });
      logged += 1;
    }
    return { doc, result: undefined };
  });

  return { logged, summary };
}

export async function hasActiveRestrictionOrLegalHold(_userId: string): Promise<boolean> {
  const doc = await readPdpaStore();
  if (doc.userRestriction[_userId]?.restricted) return true;
  const open = doc.dataSubjectRequests.some(
    (r) =>
      r.userId === _userId &&
      r.requestType === "RESTRICTION" &&
      (r.status === "PENDING" || r.status === "IN_PROGRESS")
  );
  return open;
}
