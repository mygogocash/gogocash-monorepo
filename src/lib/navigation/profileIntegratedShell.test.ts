import { describe, expect, it } from "vitest";
import { isIntegratedProfileShellPath } from "./profileIntegratedShell";

describe("isIntegratedProfileShellPath", () => {
  it("returns false for null", () => {
    expect(isIntegratedProfileShellPath(null)).toBe(false);
  });

  it("matches integrated hub routes", () => {
    expect(isIntegratedProfileShellPath("/profile")).toBe(true);
    expect(isIntegratedProfileShellPath("/profile/info")).toBe(true);
    expect(isIntegratedProfileShellPath("/profile/my-rating")).toBe(true);
    expect(isIntegratedProfileShellPath("/profile/offer")).toBe(true);
    expect(isIntegratedProfileShellPath("/profile/offer/x")).toBe(true);
    expect(isIntegratedProfileShellPath("/method")).toBe(true);
    expect(isIntegratedProfileShellPath("/method/create")).toBe(true);
    expect(isIntegratedProfileShellPath("/language")).toBe(true);
    expect(isIntegratedProfileShellPath("/wallet")).toBe(true);
    expect(isIntegratedProfileShellPath("/favorite")).toBe(true);
    expect(isIntegratedProfileShellPath("/quest/history")).toBe(true);
    expect(isIntegratedProfileShellPath("/referral")).toBe(true);
    expect(isIntegratedProfileShellPath("/missing-orders")).toBe(true);
    expect(isIntegratedProfileShellPath("/subscription")).toBe(true);
    expect(isIntegratedProfileShellPath("/membership")).toBe(true);
    expect(isIntegratedProfileShellPath("/credit-score")).toBe(true);
    expect(isIntegratedProfileShellPath("/pricing")).toBe(true);
    expect(isIntegratedProfileShellPath("/billing")).toBe(true);
    expect(isIntegratedProfileShellPath("/withdraw")).toBe(true);
    expect(isIntegratedProfileShellPath("/withdraw/my-cashback")).toBe(true);
    expect(isIntegratedProfileShellPath("/privacy-center")).toBe(true);
    expect(isIntegratedProfileShellPath("/privacy-center/x")).toBe(true);
    expect(isIntegratedProfileShellPath("/age-verification")).toBe(true);
    expect(isIntegratedProfileShellPath("/age-verification/x")).toBe(true);
  });

  it("returns false for non-hub routes (e.g. shop)", () => {
    expect(isIntegratedProfileShellPath("/shop")).toBe(false);
    expect(isIntegratedProfileShellPath("/")).toBe(false);
    expect(isIntegratedProfileShellPath("/quest")).toBe(false);
  });
});
