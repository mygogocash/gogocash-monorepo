import { describe, it, expect } from "vitest";
import { formatPrice } from "@/utils/helper";

describe("formatPrice", () => {
  it("formats a positive amount with 2 decimals", () => {
    expect(formatPrice(1234.5)).toBe("1,234.50");
  });

  it("formats zero as 0.00 (a real value, not N/A)", () => {
    expect(formatPrice(0)).toBe("0.00");
  });

  it("returns N/A for undefined", () => {
    expect(formatPrice(undefined)).toBe("N/A");
  });

  it("returns N/A for NaN", () => {
    expect(formatPrice(Number("abc"))).toBe("N/A");
  });
});
