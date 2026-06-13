import { describe, expect, it } from "vitest";
import { monthKeyToRangeEnCA } from "./monthRangeEnCA";

describe("monthKeyToRangeEnCA", () => {
  it("returns March boundaries (31 days)", () => {
    expect(monthKeyToRangeEnCA("2026-03")).toEqual({ start: "2026-03-01", end: "2026-03-31" });
  });

  it("returns February in leap year", () => {
    expect(monthKeyToRangeEnCA("2024-02")).toEqual({ start: "2024-02-01", end: "2024-02-29" });
  });

  it("returns February in non-leap year", () => {
    expect(monthKeyToRangeEnCA("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("rejects invalid keys", () => {
    expect(monthKeyToRangeEnCA("2026-13")).toBeNull();
    expect(monthKeyToRangeEnCA("bad")).toBeNull();
  });
});
