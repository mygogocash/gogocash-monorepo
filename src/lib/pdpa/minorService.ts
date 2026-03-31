import { randomBytes } from "node:crypto";
import { withPdpaStore, readPdpaStore } from "./fileStore";

const MINOR_AGE = 20;

export function computeAgeFromIsoDateOfBirth(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function isMinorProfile(params: { dateOfBirth?: string; maritalStatus?: string }): boolean {
  if (params.maritalStatus === "married") return false;
  if (!params.dateOfBirth) return false;
  return computeAgeFromIsoDateOfBirth(params.dateOfBirth) < MINOR_AGE;
}

export async function setUserProfileFlags(
  userId: string,
  partial: {
    dateOfBirth?: string;
    maritalStatus?: string;
    isMinor?: boolean;
    guardianConsentVerified?: boolean;
  }
): Promise<void> {
  await withPdpaStore(async (doc) => {
    doc.userProfiles[userId] = {
      ...doc.userProfiles[userId],
      ...partial,
    };
    if (partial.dateOfBirth && partial.maritalStatus !== "married") {
      doc.userProfiles[userId].isMinor = isMinorProfile({
        dateOfBirth: partial.dateOfBirth,
        maritalStatus: partial.maritalStatus,
      });
    }
    return { doc, result: undefined };
  });
}

export async function issueGuardianToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await withPdpaStore(async (doc) => {
    doc.userProfiles[userId] = {
      ...doc.userProfiles[userId],
      guardianConsentToken: token,
    };
    return { doc, result: undefined };
  });
  return token;
}

export async function verifyGuardianToken(userId: string, token: string): Promise<boolean> {
  const doc = await readPdpaStore();
  const p = doc.userProfiles[userId];
  if (!p?.guardianConsentToken || p.guardianConsentToken !== token) return false;
  await withPdpaStore(async (d) => {
    const prev = { ...(d.userProfiles[userId] ?? {}) };
    delete prev.guardianConsentToken;
    d.userProfiles[userId] = {
      ...prev,
      guardianConsentVerified: true,
    };
    return { doc: d, result: undefined };
  });
  return true;
}
