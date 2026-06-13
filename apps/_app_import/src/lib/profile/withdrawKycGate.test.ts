import { describe, expect, it } from "vitest";
import { getWithdrawKycSnapshot, isWithdrawProfileKycComplete } from "./withdrawKycGate";

describe("withdrawKycGate", () => {
  it("is incomplete when profile is null or empty", () => {
    expect(isWithdrawProfileKycComplete(null)).toBe(false);
    expect(isWithdrawProfileKycComplete(undefined)).toBe(false);
    expect(isWithdrawProfileKycComplete({})).toBe(false);
  });

  it("accepts snake_case id_number and legal_address", () => {
    expect(
      isWithdrawProfileKycComplete({
        id_number: " 123 ",
        legal_address: "Somewhere",
      })
    ).toBe(true);
  });

  it("accepts camelCase idNumber and legalAddress", () => {
    expect(
      isWithdrawProfileKycComplete({
        idNumber: "123",
        legalAddress: "Bangkok",
      })
    ).toBe(true);
  });

  it("requires both fields", () => {
    expect(isWithdrawProfileKycComplete({ id_number: "1" })).toBe(false);
    expect(isWithdrawProfileKycComplete({ legal_address: "x" })).toBe(false);
  });

  it("getWithdrawKycSnapshot returns flags", () => {
    expect(getWithdrawKycSnapshot({ id_number: "1" })).toEqual({
      hasCitizenOrPassportId: true,
      hasLegalAddress: false,
    });
  });
});
