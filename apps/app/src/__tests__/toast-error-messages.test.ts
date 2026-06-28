import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  authSendErrorMessages,
  isApprovedUserErrorMessage,
  toastErrorMessages,
  userErrorMessageFromUnknown,
} from "@mobile/i18n/toastMessages";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const DEPRECATED_ERROR_PATTERNS = [
  "Copy failed. Please try again.",
  "Request failed. Please try again.",
  "Withdrawal failed. Please try again.",
  "Cashback activation failed. Please try again.",
  "Sign-in failed. Please try again.",
  "Verification failed. Please try again.",
  "Unable to load catalog.",
] as const;

const ERROR_UI_FILES = [
  "src/design/webDesignParity.ts",
  "src/screens/CustomerAuthScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/gototrack/GoGoTrackDetectionBanner.tsx",
  "src/components/CustomerRouteState.tsx",
  "src/screens/CustomerCatalogScreens.tsx",
] as const;

describe("toast error messages — canonical patterns", () => {
  it("given every toastErrorMessages value > then it follows the approved house pattern", () => {
    for (const message of Object.values(toastErrorMessages)) {
      expect(isApprovedUserErrorMessage(message)).toBe(true);
    }
  });

  it("given auth send-error copy > then generic uses requestFailed and specials stay allowlisted", () => {
    expect(authSendErrorMessages.generic).toBe(toastErrorMessages.requestFailed);
    expect(isApprovedUserErrorMessage(authSendErrorMessages.rateLimit)).toBe(true);
    expect(isApprovedUserErrorMessage(authSendErrorMessages.securityCheck)).toBe(true);
    expect(isApprovedUserErrorMessage(authSendErrorMessages.invalidPhone)).toBe(true);
    expect(isApprovedUserErrorMessage(authSendErrorMessages.notConfigured)).toBe(true);
  });

  it("given userErrorMessageFromUnknown > then it never returns raw provider error text", () => {
    expect(userErrorMessageFromUnknown(new Error("Request failed with status 500"))).toBe(
      toastErrorMessages.generic,
    );
    expect(
      userErrorMessageFromUnknown(new Error("blocked"), toastErrorMessages.withdrawalFailed),
    ).toBe(toastErrorMessages.withdrawalFailed);
  });
});

describe("toast error messages — call-site hygiene", () => {
  it("given error UI source files > then deprecated English error copy is not present", () => {
    for (const relativePath of ERROR_UI_FILES) {
      const source = readMobileFile(relativePath);
      for (const deprecated of DEPRECATED_ERROR_PATTERNS) {
        expect(source, `${relativePath} still contains "${deprecated}"`).not.toContain(deprecated);
      }
    }
  });

  it("given withdrawal catch handling > then it uses the canonical withdrawal message constant", () => {
    const source = readMobileFile("src/screens/CustomerMoneyActionScreen.tsx");
    expect(source).toContain("toastErrorMessages.withdrawalFailed");
    expect(source).not.toMatch(/error instanceof Error\s*\?\s*error\.message/);
  });

  it("given profile hero copy failure > then it reuses the shared copyFailed constant", () => {
    const designFile = readMobileFile("src/design/webDesignParity.ts");
    expect(designFile).toContain("toastErrorMessages.copyFailed");
  });
});
