import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/currencyFormat";

describe("formatMoney", () => {
  it("given an integer > then appends the THB code by default", () => {
    expect(formatMoney(149)).toBe("149 THB");
  });

  it("groups thousands with commas", () => {
    expect(formatMoney(5000)).toBe("5,000 THB");
    expect(formatMoney(1250000)).toBe("1,250,000 THB");
  });

  it("uses the given currency code as a suffix", () => {
    expect(formatMoney(50, "USD")).toBe("50 USD");
  });

  it("uppercases the currency code", () => {
    expect(formatMoney(100, "usd")).toBe("100 USD");
  });

  it("given decimals > then fixes the fraction digits", () => {
    expect(formatMoney(1234.5, "USD", { decimals: 2 })).toBe("1,234.50 USD");
  });

  it("rounds to the requested decimals", () => {
    expect(formatMoney(1234.567, "THB", { decimals: 0 })).toBe("1,235 THB");
  });

  it("accepts numeric strings", () => {
    expect(formatMoney("250")).toBe("250 THB");
  });

  it("treats zero as a valid amount, not a fallback", () => {
    expect(formatMoney(0)).toBe("0 THB");
  });

  it("given null/undefined/unparseable > then returns the fallback", () => {
    expect(formatMoney(null)).toBe("N/A");
    expect(formatMoney(undefined)).toBe("N/A");
    expect(formatMoney("abc")).toBe("N/A");
  });

  it("honours a custom fallback", () => {
    expect(formatMoney(null, "USD", { fallback: "—" })).toBe("—");
  });

  it("falls back to THB when currency is empty", () => {
    expect(formatMoney(10, "")).toBe("10 THB");
  });
});
