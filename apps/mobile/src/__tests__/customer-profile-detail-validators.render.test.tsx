import { describe, expect, it } from "vitest";

import { isValidBirthdate, isValidPassportId } from "@mobile/screens/CustomerProfileDetailScreen";

// Bug-hunt fixes for CustomerProfileDetailScreen identity validation:
//  #6 — passport was length-only (accepted "#@!ABC1") despite the "alphanumeric" message.
//  #7 — birthdate was format-only (accepted "2026-13-45" and future dates).

describe("isValidPassportId", () => {
  it("accepts 7–15 alphanumeric characters", () => {
    expect(isValidPassportId("AB1234567")).toBe(true);
    expect(isValidPassportId("A234567")).toBe(true); // 7
    expect(isValidPassportId("A23456789012345")).toBe(true); // 15
  });

  it("rejects non-alphanumeric characters", () => {
    expect(isValidPassportId("#@!ABC1")).toBe(false);
    expect(isValidPassportId("ABC 1234")).toBe(false);
  });

  it("rejects too-short / too-long", () => {
    expect(isValidPassportId("ABC123")).toBe(false); // 6
    expect(isValidPassportId("A234567890123456")).toBe(false); // 16
    expect(isValidPassportId("   ")).toBe(false);
  });
});

describe("isValidBirthdate", () => {
  const now = new Date("2026-06-02T00:00:00Z");

  it("accepts a real past date in YYYY-MM-DD", () => {
    expect(isValidBirthdate("1990-01-01", now)).toBe(true);
  });

  it("rejects malformed format", () => {
    expect(isValidBirthdate("not-a-date", now)).toBe(false);
    expect(isValidBirthdate("1990-1-1", now)).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidBirthdate("2026-13-45", now)).toBe(false);
    expect(isValidBirthdate("2000-02-30", now)).toBe(false);
  });

  it("rejects future dates", () => {
    expect(isValidBirthdate("2999-01-01", now)).toBe(false);
  });
});
