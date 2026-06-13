import { randomUUID } from "node:crypto";
import {
  DATA_SUBJECT_SLA_DAYS,
  HUMAN_REVIEW_SLA_BUSINESS_DAYS,
  type DataSubjectRequestType,
} from "./constants";
import type { DataSubjectRequest } from "./types";
import { withPdpaStore, readPdpaStore } from "./fileStore";

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export async function createDataSubjectRequest(params: {
  userId: string;
  requestType: DataSubjectRequestType;
  channel: DataSubjectRequest["channel"];
  payload?: Record<string, unknown>;
}): Promise<DataSubjectRequest> {
  const submittedAt = new Date().toISOString();
  const slaDays =
    params.requestType === "HUMAN_REVIEW" ? HUMAN_REVIEW_SLA_BUSINESS_DAYS : DATA_SUBJECT_SLA_DAYS;
  const dueDate = addDays(submittedAt, slaDays);

  const row: DataSubjectRequest = {
    requestId: randomUUID(),
    userId: params.userId,
    requestType: params.requestType,
    status: "PENDING",
    submittedAt,
    acknowledgedAt: null,
    dueDate,
    completedAt: null,
    handledBy: "AUTOMATED",
    rejectionReason: null,
    evidenceLog: [
      {
        action: "REQUEST_CREATED",
        timestamp: submittedAt,
        performedBy: "SYSTEM",
      },
    ],
    channel: params.channel,
    payload: params.payload,
  };

  await withPdpaStore(async (doc) => {
    doc.dataSubjectRequests.push(row);
    return { doc, result: undefined };
  });

  return row;
}

export async function listRequestsForUser(userId: string): Promise<DataSubjectRequest[]> {
  const doc = await readPdpaStore();
  return doc.dataSubjectRequests
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/** Portable export — machine-readable bundle (placeholder until backend DB). */
export async function buildAccessExport(userId: string): Promise<Record<string, unknown>> {
  const doc = await readPdpaStore();
  return {
    userId,
    exportedAt: new Date().toISOString(),
    consentRecords: doc.consentRecords.filter((c) => c.userId === userId),
    dataSubjectRequests: doc.dataSubjectRequests.filter((r) => r.userId === userId),
    note: "Full production export must include all backend collections (transactions, wallet, etc.).",
  };
}

export async function markRequestStatus(
  requestId: string,
  status: DataSubjectRequest["status"],
  handledBy: string,
  rejectionReason?: string
): Promise<void> {
  await withPdpaStore(async (doc) => {
    const r = doc.dataSubjectRequests.find((x) => x.requestId === requestId);
    if (!r) return { doc, result: undefined };
    r.status = status;
    r.handledBy = handledBy;
    if (rejectionReason) r.rejectionReason = rejectionReason;
    if (status === "COMPLETED") r.completedAt = new Date().toISOString();
    r.evidenceLog.push({
      action: `STATUS_${status}`,
      timestamp: new Date().toISOString(),
      performedBy: handledBy,
    });
    return { doc, result: undefined };
  });
}

export async function setUserRestriction(userId: string, restricted: boolean): Promise<void> {
  await withPdpaStore(async (doc) => {
    doc.userRestriction[userId] = {
      restricted,
      since: new Date().toISOString(),
    };
    return { doc, result: undefined };
  });
}

export async function isUserRestricted(userId: string): Promise<boolean> {
  const doc = await readPdpaStore();
  return doc.userRestriction[userId]?.restricted === true;
}
