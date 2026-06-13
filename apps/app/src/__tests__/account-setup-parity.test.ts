import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  canonicalThaiMobile,
  isCitizenIdValid,
  isOtpValid,
  isThaiMobileValid,
  maskTail,
} from "@mobile/features/accountSetup";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Account setup parity", () => {
  it("account setup flow > given the Next PromptPay onboarding contract > then Expo owns the same branches and copy", () => {
    const designFile = readMobileFile("src/design/webDesignParity.ts");
    const screenFile = readMobileFile("src/screens/CustomerAccountSetupScreen.tsx");

    expect(designFile).toContain("webAccountSetupFlow");
    expect(designFile).toContain("Setup PromptPay as Withdrawal Method");
    expect(designFile).toContain("Use This Phone Number : {tail}");
    expect(designFile).toContain("Change to other Phone Numbers");
    expect(designFile).toContain("Use Citizen ID");
    expect(designFile).toContain("or setup withdrawal method with");
    expect(designFile).toContain("Bank Account");
    expect(designFile).toContain("Crypto Wallet");
    expect(designFile).toContain("Enter the phone number to use");
    expect(designFile).toContain("Enter the verification code");
    expect(designFile).toContain("Enter your Citizen ID");
    expect(designFile).toContain("Enter your name to confirm the transfer");

    expect(screenFile).toContain("webAccountSetupFlow");
    expect(screenFile).toContain("AccountSetupStep");
    expect(screenFile).toContain('"registered_phone"');
    expect(screenFile).toContain('"other_phone"');
    expect(screenFile).toContain('"citizen_id"');
    expect(screenFile).toContain('"op_input"');
    expect(screenFile).toContain('"op_otp"');
    expect(screenFile).toContain('"op_name"');
    expect(screenFile).toContain('"ci_input"');
    expect(screenFile).toContain('"ci_name"');
    expect(screenFile).toContain("isThaiMobileValid");
    expect(screenFile).toContain("isCitizenIdValid");
    expect(screenFile).toContain("isOtpValid");
    expect(screenFile).toContain("canonicalThaiMobile");
    expect(screenFile).toContain('accessibilityRole="radio"');
    expect(screenFile).toContain('router.push("/method/create")');
    expect(screenFile).toContain('router.replace("/")');
    expect(screenFile).not.toContain("Complete profile");
    expect(screenFile).not.toContain("Username");
    expect(screenFile).not.toContain("Add the basic details");
  });

  it("account setup validators > given PromptPay input variants > then Expo matches the Next validation rules", () => {
    expect(maskTail("0891234567")).toBe("***4567");
    expect(maskTail("123")).toBe("");
    expect(isThaiMobileValid("0812345678")).toBe(true);
    expect(isThaiMobileValid("812345678")).toBe(true);
    expect(isThaiMobileValid("12345")).toBe(false);
    expect(canonicalThaiMobile("812-345-678")).toBe("0812345678");
    expect(canonicalThaiMobile("081-234-5678")).toBe("0812345678");
    expect(isCitizenIdValid("1234567890123")).toBe(true);
    expect(isCitizenIdValid("123456789012")).toBe(false);
    expect(isOtpValid("123456")).toBe(true);
    expect(isOtpValid("654321")).toBe(false);
  });
});
