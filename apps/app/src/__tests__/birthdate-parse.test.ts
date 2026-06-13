import { describe, expect, it } from "vitest";

import { parseDmyDate } from "@mobile/lib/birthdate";

// Birthdate inputs use the Thai-locale DD-MM-YYYY format. parseDmyDate is the shared strict parser
// behind isValidBirthdate (profile) and isOver20 (age gate) — native Date() can't parse DD-MM-YYYY.
describe("parseDmyDate", () => {
  it("parseDmyDate > given a valid DD-MM-YYYY date > then returns the UTC date", () => {
    const parsed = parseDmyDate("23-05-1996");
    expect(parsed).not.toBeNull();
    expect(parsed?.getUTCFullYear()).toBe(1996);
    expect(parsed?.getUTCMonth()).toBe(4); // May, 0-based
    expect(parsed?.getUTCDate()).toBe(23);
  });

  it("parseDmyDate > given a malformed string > then returns null", () => {
    expect(parseDmyDate("")).toBeNull();
    expect(parseDmyDate("not-a-date")).toBeNull();
    expect(parseDmyDate("1-1-1990")).toBeNull(); // requires zero-padded DD/MM
    expect(parseDmyDate("1996-05-23")).toBeNull(); // ISO order is rejected
  });

  it("parseDmyDate > given an impossible calendar date > then returns null (no roll-over)", () => {
    expect(parseDmyDate("30-02-2000")).toBeNull(); // Feb 30
    expect(parseDmyDate("45-13-2026")).toBeNull(); // day 45 / month 13
    expect(parseDmyDate("31-04-2020")).toBeNull(); // April has 30 days
  });

  it("parseDmyDate > given surrounding whitespace > then trims and parses", () => {
    expect(parseDmyDate("  01-01-1990  ")).not.toBeNull();
  });
});
