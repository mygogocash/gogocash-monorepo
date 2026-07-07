import { describe, expect, it } from "vitest";

import { isGoGoPassSubscriber, readMembershipTier } from "../lib/membershipTier";

describe("membershipTier > isGoGoPassSubscriber", () => {
  it("given gogopass or gogopass-pro > then returns true", () => {
    expect(isGoGoPassSubscriber("gogopass")).toBe(true);
    expect(isGoGoPassSubscriber("gogopass-pro")).toBe(true);
  });

  it("given starter, free, empty, or undefined > then returns false", () => {
    expect(isGoGoPassSubscriber("starter")).toBe(false);
    expect(isGoGoPassSubscriber("free")).toBe(false);
    expect(isGoGoPassSubscriber("")).toBe(false);
    expect(isGoGoPassSubscriber(undefined)).toBe(false);
    expect(isGoGoPassSubscriber(null)).toBe(false);
  });
});

describe("membershipTier > readMembershipTier", () => {
  it("given a non-empty string > then trims and returns it", () => {
    expect(readMembershipTier(" gogopass ")).toBe("gogopass");
  });

  it("given blank or non-string values > then returns undefined", () => {
    expect(readMembershipTier("")).toBeUndefined();
    expect(readMembershipTier("   ")).toBeUndefined();
    expect(readMembershipTier(null)).toBeUndefined();
    expect(readMembershipTier(undefined)).toBeUndefined();
  });
});
