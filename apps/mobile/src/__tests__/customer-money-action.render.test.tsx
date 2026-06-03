import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CustomerMoneyActionScreen,
  evaluateWithdraw,
  parseWithdrawAmount,
} from "@mobile/screens/CustomerMoneyActionScreen";

// Bug-hunt fixes for CustomerMoneyActionScreen:
//  #2 — withdrawal amount was parsed with raw parseFloat ("1,500.00" -> 1, "500abc" -> 500).
//  #1 — Confirm action had no guard after a successful submit -> a second tap deducted again.

// Wave B (B3) per-screen UX adoption for the withdraw/money-action form. This file keeps the
// existing pure-logic + source-guard tests above, and ADDS: (a) a render mount proving the
// withdraw form still mounts after being wrapped in KeyboardAwareScreen (react-native ->
// react-native-web, happy-dom), and (b) source-signal assertions for the applied Wave A
// foundations — KeyboardAwareScreen around the amount form and haptics fired on the existing
// evaluateWithdraw decision branches (success on ok:true, error on an invalid attempt).
// Skeleton/RefreshControl are intentionally NOT adopted: this is a form/action surface, not a
// data list. The screen has no Animated timelines and no icon-only sub-44px button (the back
// control is a full-width >=44px text action), so reduce-motion + hitSlop have no target here.
const moneyActionSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerMoneyActionScreen.tsx"),
  "utf8"
);

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

describe("CustomerMoneyActionScreen (render)", () => {
  it("mounts the withdraw form without throwing", () => {
    expect(() => render(createElement(CustomerMoneyActionScreen, { mode: "withdraw" }))).not.toThrow();
    // The amount form's primary action label proves the withdraw surface rendered.
    expect(screen.getAllByText("Confirm & Dispatch").length).toBeGreaterThan(0);
  });

  it("renders the withdrawal amount field so the keyboard-avoidance wrapper has a target", () => {
    render(createElement(CustomerMoneyActionScreen, { mode: "withdraw" }));
    expect(screen.getAllByPlaceholderText("0.00").length).toBeGreaterThan(0);
  });
});

describe("CustomerMoneyActionScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the amount form in KeyboardAwareScreen so the numeric keyboard never covers the field", () => {
    expect(moneyActionSource).toContain('from "@mobile/components/KeyboardAwareScreen"');
    expect(moneyActionSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a confirmed withdrawal + error on an invalid attempt", () => {
    // Wired onto the EXISTING evaluateWithdraw decision (ok:true -> success, error branch -> error),
    // not a duplicated validation path.
    expect(moneyActionSource).toContain('from "@mobile/lib/haptics"');
    expect(moneyActionSource).toContain("haptics.success(");
    expect(moneyActionSource).toContain("haptics.error(");
  });

  it("formats the available balance with thousands separators (web parity: 3,180.24 not 3180.24)", () => {
    // Web money display is comma-grouped via formatCashDisplay; the withdraw hero must
    // group too — guard against a regression back to a bare balance.toFixed(2).
    expect(moneyActionSource).toContain('toLocaleString("en-US"');
    expect(moneyActionSource).toContain("minimumFractionDigits: 2");
  });
});
