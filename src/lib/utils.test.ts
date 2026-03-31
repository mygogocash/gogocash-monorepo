import { describe, expect, it } from "vitest";
import { cn, formatAddress, formatCashDisplay, formatNumber, getPercent } from "./utils";

describe("cn", () => {
  it("merges tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});

describe("formatAddress", () => {
  it("returns short form for long addresses", () => {
    expect(formatAddress("0x1234567890abcdef", 6, 4)).toBe("0x1234...cdef");
  });

  it("returns full string when short", () => {
    expect(formatAddress("0xabc")).toBe("0xabc");
  });
});

describe("formatNumber", () => {
  it("formats decimals", () => {
    expect(formatNumber(3.1)).toBe("3.10");
  });
});

describe("formatCashDisplay", () => {
  it("omits fraction when whole number", () => {
    expect(formatCashDisplay(3180)).toBe("3,180");
    expect(formatCashDisplay(3180.0)).toBe("3,180");
  });

  it("shows up to two decimals when needed", () => {
    expect(formatCashDisplay(3180.24)).toBe("3,180.24");
    expect(formatCashDisplay(3180.2)).toBe("3,180.2");
  });

  it("rounds to max decimals", () => {
    expect(formatCashDisplay(1.236)).toBe("1.24");
    expect(formatCashDisplay(10.999)).toBe("11");
  });
});

describe("getPercent", () => {
  it("returns 0 when commissions missing", () => {
    expect(getPercent(undefined)).toBe("0.0");
    expect(getPercent([])).toBe("0.0");
  });

  it("reads first positive commission row", () => {
    expect(getPercent([{ cashback: "5.5%" }])).toBe("5.5");
    expect(getPercent([{ cashback: "5.5%" }], true)).toBe("5.5%");
  });
});
