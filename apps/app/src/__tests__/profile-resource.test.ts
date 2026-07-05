import { describe, expect, it } from "vitest";

import { isProfileResourceBlocking } from "../api/profileTypes";

describe("isProfileResourceBlocking", () => {
  it("isProfileResourceBlocking > given an authenticated session > then API error or empty does not block the profile hub", () => {
    expect(isProfileResourceBlocking("error", true)).toBe(false);
    expect(isProfileResourceBlocking("empty", true)).toBe(false);
    expect(isProfileResourceBlocking("offline", true)).toBe(false);
    expect(isProfileResourceBlocking("loading", true)).toBe(false);
    expect(isProfileResourceBlocking("ready", true)).toBe(false);
  });

  it("isProfileResourceBlocking > given no session > then only ready status renders the hub", () => {
    expect(isProfileResourceBlocking("ready", false)).toBe(false);
    expect(isProfileResourceBlocking("loading", false)).toBe(true);
    expect(isProfileResourceBlocking("error", false)).toBe(true);
    expect(isProfileResourceBlocking("empty", false)).toBe(true);
  });

  it("isProfileResourceBlocking > given disabled backend mode > then always blocks", () => {
    expect(isProfileResourceBlocking("disabled", true)).toBe(true);
    expect(isProfileResourceBlocking("disabled", false)).toBe(true);
  });
});
