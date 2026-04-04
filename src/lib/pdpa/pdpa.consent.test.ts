import { describe, expect, it } from "vitest";
import type { ConsentRecord } from "./types";
import { getLatestGrantMap, isPurposeGranted } from "./consentService";

function rec(
  id: string,
  userId: string,
  purposes: ConsentRecord["purposes"],
  createdAt: string
): ConsentRecord {
  return {
    id,
    userId,
    consentVersion: "v1",
    purposes,
    legalBasis: "test",
    withdrawnAt: null,
    withdrawalMethod: null,
    guardianConsent: null,
    isMinor: false,
    ageAtConsent: null,
    createdAt,
  };
}

describe("consent append-only semantics", () => {
  it("tracks grant then withdraw per purpose", () => {
    const records: ConsentRecord[] = [
      rec(
        "1",
        "u1",
        [
          {
            purposeCode: "MARKETING_COMMUNICATIONS",
            granted: true,
            timestamp: "2025-01-01T00:00:00.000Z",
            method: "IN_APP_ONBOARDING",
            ipAddressHashed: "",
            deviceFingerprintHashed: "",
            consentText: "m",
          },
        ],
        "2025-01-01T00:00:00.000Z"
      ),
      rec(
        "2",
        "u1",
        [
          {
            purposeCode: "MARKETING_COMMUNICATIONS",
            granted: false,
            timestamp: "2025-01-02T00:00:00.000Z",
            method: "SETTINGS_UPDATE",
            ipAddressHashed: "",
            deviceFingerprintHashed: "",
            consentText: "w",
          },
        ],
        "2025-01-02T00:00:00.000Z"
      ),
    ];
    const map = getLatestGrantMap(records, "u1");
    expect(map.has("MARKETING_COMMUNICATIONS")).toBe(false);
  });

  it("isPurposeGranted false when consent older than refresh window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 400);
    const iso = old.toISOString();
    const records: ConsentRecord[] = [
      rec(
        "1",
        "u1",
        [
          {
            purposeCode: "CASHBACK_TRACKING",
            granted: true,
            timestamp: iso,
            method: "IN_APP_ONBOARDING",
            ipAddressHashed: "",
            deviceFingerprintHashed: "",
            consentText: "c",
          },
        ],
        iso
      ),
    ];
    expect(isPurposeGranted(records, "u1", "CASHBACK_TRACKING")).toBe(false);
  });
});
