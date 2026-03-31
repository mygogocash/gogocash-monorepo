import { randomUUID } from "node:crypto";
import {
  CONSENT_REFRESH_DAYS,
  PDPA_CONSENT_VERSION,
  type ConsentMethod,
  type PurposeCode,
} from "./constants";
import { getLawfulBasisLabel } from "./lawfulBasis";
import type { ConsentRecord, PurposeConsent } from "./types";
import { withPdpaStore } from "./fileStore";

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

/** Latest grant timestamp per purpose from append-only records */
export function getLatestGrantMap(
  records: ConsentRecord[],
  userId: string
): Map<PurposeCode, Date> {
  const map = new Map<PurposeCode, Date>();
  const sorted = records
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const r of sorted) {
    for (const p of r.purposes) {
      if (p.granted) {
        map.set(p.purposeCode, new Date(p.timestamp));
      } else {
        map.delete(p.purposeCode);
      }
    }
  }
  return map;
}

export function isPurposeGranted(
  records: ConsentRecord[],
  userId: string,
  purpose: PurposeCode
): boolean {
  const map = getLatestGrantMap(records, userId);
  if (!map.has(purpose)) return false;
  const ts = map.get(purpose)!;
  if (daysBetween(new Date(), ts) > CONSENT_REFRESH_DAYS) {
    return false;
  }
  return true;
}

export interface RecordConsentInput {
  userId: string;
  purposes: { purposeCode: PurposeCode; granted: boolean; consentText: string }[];
  method: ConsentMethod;
  ipAddressHashed: string;
  deviceFingerprintHashed: string;
  isMinor: boolean;
  ageAtConsent: number | null;
  guardianConsent: ConsentRecord["guardianConsent"];
}

export async function appendConsentRecord(input: RecordConsentInput): Promise<ConsentRecord> {
  const createdAt = new Date().toISOString();
  const purposes: PurposeConsent[] = input.purposes.map((p) => ({
    purposeCode: p.purposeCode,
    granted: p.granted,
    timestamp: createdAt,
    method: input.method,
    ipAddressHashed: input.ipAddressHashed,
    deviceFingerprintHashed: input.deviceFingerprintHashed,
    consentText: p.consentText,
  }));

  const primaryPurpose = input.purposes[0]?.purposeCode ?? "CASHBACK_TRACKING";
  const legal = getLawfulBasisLabel(primaryPurpose);

  const row: ConsentRecord = {
    id: randomUUID(),
    userId: input.userId,
    consentVersion: PDPA_CONSENT_VERSION,
    purposes,
    legalBasis: `${legal.basis} ${legal.section}`,
    withdrawnAt: null,
    withdrawalMethod: null,
    guardianConsent: input.guardianConsent ?? null,
    isMinor: input.isMinor,
    ageAtConsent: input.ageAtConsent,
    createdAt,
  };

  await withPdpaStore(async (doc) => {
    doc.consentRecords.push(row);
    return { doc, result: undefined };
  });

  return row;
}

export async function appendWithdrawalConsent(
  userId: string,
  purposeCodes: PurposeCode[],
  method: string,
  ipAddressHashed: string,
  deviceFingerprintHashed: string
): Promise<ConsentRecord> {
  const createdAt = new Date().toISOString();
  const purposes: PurposeConsent[] = purposeCodes.map((purposeCode) => ({
    purposeCode,
    granted: false,
    timestamp: createdAt,
    method: "SETTINGS_UPDATE",
    ipAddressHashed,
    deviceFingerprintHashed,
    consentText: "Withdrawal",
  }));

  const row: ConsentRecord = {
    id: randomUUID(),
    userId,
    consentVersion: PDPA_CONSENT_VERSION,
    purposes,
    legalBasis: "WITHDRAWAL",
    withdrawnAt: createdAt,
    withdrawalMethod: method,
    guardianConsent: null,
    isMinor: false,
    ageAtConsent: null,
    createdAt,
  };

  await withPdpaStore(async (doc) => {
    doc.consentRecords.push(row);
    return { doc, result: undefined };
  });

  return row;
}

export async function listConsentRecords(userId: string): Promise<ConsentRecord[]> {
  const { readPdpaStore } = await import("./fileStore");
  const doc = await readPdpaStore();
  return doc.consentRecords
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
