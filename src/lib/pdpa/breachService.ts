import { randomUUID } from "node:crypto";
import { BREACH_PDPC_HOURS } from "./constants";
import type { BreachSeverity, BreachStatus } from "./constants";
import type { DataBreachLog } from "./types";
import { withPdpaStore, readPdpaStore } from "./fileStore";

export function computePdpcDeadline(detectedAt: string): string {
  const d = new Date(detectedAt);
  d.setHours(d.getHours() + BREACH_PDPC_HOURS);
  return d.toISOString();
}

export async function createBreachLog(input: {
  detectedAt: string;
  severity: BreachSeverity;
  affectedUsers: number;
  dataCategories: string[];
  description: string;
  rootCause: string;
  userNotificationRequired: boolean;
}): Promise<DataBreachLog> {
  const breachId = randomUUID();
  const row: DataBreachLog = {
    breachId,
    detectedAt: input.detectedAt,
    reportedToPDPC: false,
    pdpcNotificationDeadline: computePdpcDeadline(input.detectedAt),
    pdpcNotifiedAt: null,
    severity: input.severity,
    affectedUsers: input.affectedUsers,
    dataCategories: input.dataCategories,
    description: input.description,
    rootCause: input.rootCause,
    containmentActions: [],
    userNotificationRequired: input.userNotificationRequired,
    usersNotifiedAt: null,
    status: "DETECTED",
    timeline: [{ event: "DETECTED", timestamp: input.detectedAt }],
  };

  await withPdpaStore(async (doc) => {
    doc.dataBreachLogs.push(row);
    return { doc, result: undefined };
  });

  return row;
}

export async function listBreaches(): Promise<DataBreachLog[]> {
  const doc = await readPdpaStore();
  return [...doc.dataBreachLogs].sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
  );
}

export async function updateBreachStatus(breachId: string, status: BreachStatus): Promise<void> {
  await withPdpaStore(async (doc) => {
    const b = doc.dataBreachLogs.find((x) => x.breachId === breachId);
    if (!b) return { doc, result: undefined };
    b.status = status;
    b.timeline.push({ event: status, timestamp: new Date().toISOString() });
    return { doc, result: undefined };
  });
}

/** Escalation check: PDPC not filed and deadline passed warning window */
export function breachEscalationDue(b: DataBreachLog, now: Date): "T48" | "T71" | null {
  if (b.reportedToPDPC || b.pdpcNotifiedAt) return null;
  const detected = new Date(b.detectedAt).getTime();
  const hours = (now.getTime() - detected) / (60 * 60 * 1000);
  if (hours >= 71) return "T71";
  if (hours >= 48) return "T48";
  return null;
}
