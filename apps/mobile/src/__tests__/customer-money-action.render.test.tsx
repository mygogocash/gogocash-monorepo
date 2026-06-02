import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { evaluateWithdraw, parseWithdrawAmount } from "@mobile/screens/CustomerMoneyActionScreen";

// Bug-hunt fixes for CustomerMoneyActionScreen:
//  #2 — withdrawal amount was parsed with raw parseFloat ("1,500.00" -> 1, "500abc" -> 500).
//  #1 — Confirm action had no guard after a successful submit -> a second tap deducted again.

describe("parseWithdrawAmount", () => {
  it("parses a plain decimal", () => {
    expect(parseWithdrawAmount("500.00")).toBe(500);
  });

  it("strips thousands separators instead of truncating at the comma", () => {
    expect(parseWithdrawAmount("1,500.00")).toBe(1500);
  });

  it("rejects trailing junk rather than silently truncating", () => {
    expect(Number.isNaN(parseWithdrawAmount("500abc"))).toBe(true);
  });

  it("rejects empty / non-numeric input", () => {
    expect(Number.isNaN(parseWithdrawAmount(""))).toBe(true);
    expect(Number.isNaN(parseWithdrawAmount("abc"))).toBe(true);
  });

  it("accepts integers and small decimals", () => {
    expect(parseWithdrawAmount("12")).toBe(12);
    expect(parseWithdrawAmount("12.5")).toBe(12.5);
  });
});

describe("evaluateWithdraw", () => {
  it("approves a valid amount within balance with a selected method", () => {
    expect(evaluateWithdraw("500.00", 3180.24, true, false)).toEqual({ ok: true, amount: 500 });
  });

  it("rejects an amount over the available balance", () => {
    const d = evaluateWithdraw("5000", 3180.24, true, false);
    expect(d.ok).toBe(false);
  });

  it("rejects a comma-formatted amount that exceeds balance (no parse truncation bypass)", () => {
    // "5,000.00" must NOT parse to 5 and slip past the balance check.
    const d = evaluateWithdraw("5,000.00", 3180.24, true, false);
    expect(d.ok).toBe(false);
  });

  it("rejects when no payout method is selected", () => {
    expect(evaluateWithdraw("100", 3180.24, false, false).ok).toBe(false);
  });

  it("blocks a second submission once already submitted (no double-deduct)", () => {
    expect(evaluateWithdraw("500.00", 3180.24, true, true)).toEqual({ ok: false, error: null });
  });
});

describe("withdraw confirm button is guarded after success (source)", () => {
  const src = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMoneyActionScreen.tsx"),
    "utf8"
  );
  it("disables the Confirm & Dispatch action once a withdrawal has succeeded", () => {
    expect(src).toContain("disabled={!!successMsg}");
  });
});
