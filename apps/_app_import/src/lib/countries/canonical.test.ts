import { describe, expect, it } from "vitest";
import { iso2ToLabel, isCanonicalIso2, toIso2 } from "./canonical";

describe("toIso2", () => {
  it("returns empty string for null/undefined/whitespace input", () => {
    expect(toIso2(null)).toBe("");
    expect(toIso2(undefined)).toBe("");
    expect(toIso2("")).toBe("");
    expect(toIso2("   ")).toBe("");
  });

  it("upper-cases and trims already-ISO-2 input", () => {
    expect(toIso2("th")).toBe("TH");
    expect(toIso2("TH")).toBe("TH");
    expect(toIso2("  sg  ")).toBe("SG");
  });

  it("maps full English names to ISO-2 (case- and whitespace-insensitive)", () => {
    expect(toIso2("Thailand")).toBe("TH");
    expect(toIso2("thailand")).toBe("TH");
    expect(toIso2("  THAILAND  ")).toBe("TH");
    expect(toIso2("Singapore")).toBe("SG");
    expect(toIso2("United States")).toBe("US");
    expect(toIso2("United States of America")).toBe("US");
    expect(toIso2("United Kingdom")).toBe("GB");
    expect(toIso2("Hong Kong")).toBe("HK");
  });

  it("falls through to trimmed-uppercase for unmapped longer strings", () => {
    expect(toIso2("Mongolia")).toBe("MONGOLIA");
  });
});

describe("iso2ToLabel", () => {
  it("returns full English name for known codes", () => {
    expect(iso2ToLabel("TH")).toBe("Thailand");
    expect(iso2ToLabel("th")).toBe("Thailand");
    expect(iso2ToLabel("SG")).toBe("Singapore");
    expect(iso2ToLabel("US")).toBe("United States");
    expect(iso2ToLabel("GB")).toBe("United Kingdom");
  });

  it("returns the upper-cased code for unmapped values", () => {
    expect(iso2ToLabel("XX")).toBe("XX");
  });

  it("returns empty string for null/undefined/empty input", () => {
    expect(iso2ToLabel(null)).toBe("");
    expect(iso2ToLabel(undefined)).toBe("");
    expect(iso2ToLabel("")).toBe("");
  });
});

describe("isCanonicalIso2", () => {
  it("recognises canonical ISO-2", () => {
    expect(isCanonicalIso2("TH")).toBe(true);
    expect(isCanonicalIso2("US")).toBe(true);
  });

  it("rejects lowercase, full names, and bad input", () => {
    expect(isCanonicalIso2("th")).toBe(false);
    expect(isCanonicalIso2("Thailand")).toBe(false);
    expect(isCanonicalIso2("")).toBe(false);
    expect(isCanonicalIso2(null)).toBe(false);
    expect(isCanonicalIso2(undefined)).toBe(false);
    expect(isCanonicalIso2("THA")).toBe(false);
  });
});
