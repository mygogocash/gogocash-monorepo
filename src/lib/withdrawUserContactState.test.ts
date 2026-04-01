import { describe, expect, it } from "vitest";
import {
  allContactsVerifiedForSave,
  createContactRow,
  mergeContactValue,
  rowNeedsOtp,
} from "@/lib/withdrawUserContactState";

describe("mergeContactValue", () => {
  it("clears OTP state when value emptied", () => {
    const row = createContactRow("x@y.com");
    const next = mergeContactValue(row, "  ", new Set(), "email");
    expect(next.otpVerified).toBe(true);
    expect(next.value).toBe("  ");
  });

  it("marks on-file email as verified without OTP", () => {
    const row = createContactRow("");
    const initial = new Set(["a@b.com"]);
    const next = mergeContactValue(row, "A@B.COM", initial, "email");
    expect(next.otpVerified).toBe(true);
  });

  it("marks new email as needing verification", () => {
    const row = createContactRow("");
    const next = mergeContactValue(row, "new@x.com", new Set(), "email");
    expect(next.otpVerified).toBe(false);
  });
});

describe("rowNeedsOtp", () => {
  it("false for empty row", () => {
    const row = createContactRow("");
    expect(rowNeedsOtp(row, new Set(), "email")).toBe(false);
  });

  it("false when on file", () => {
    const row = { ...createContactRow("a@b.com"), otpVerified: false };
    expect(rowNeedsOtp(row, new Set(["a@b.com"]), "email")).toBe(false);
  });

  it("true when new and unverified", () => {
    const row = { ...createContactRow("new@x.com"), otpVerified: false };
    expect(rowNeedsOtp(row, new Set(), "email")).toBe(true);
  });
});

describe("allContactsVerifiedForSave", () => {
  it("allows empty rows", () => {
    const rows = [createContactRow(""), createContactRow("  ")];
    expect(allContactsVerifiedForSave(rows, new Set(), "email")).toBe(true);
  });

  it("fails if any row needs OTP", () => {
    const rows = [{ ...createContactRow("n@x.com"), otpVerified: false }];
    expect(allContactsVerifiedForSave(rows, new Set(), "email")).toBe(false);
  });

  it("passes when new value verified", () => {
    const rows = [{ ...createContactRow("n@x.com"), otpVerified: true }];
    expect(allContactsVerifiedForSave(rows, new Set(), "email")).toBe(true);
  });
});
