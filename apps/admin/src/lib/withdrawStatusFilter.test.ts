import { describe, expect, it } from "vitest";

import {
  parseWithdrawStatusFilter,
  withdrawListHref,
} from "./withdrawStatusFilter";

describe("parseWithdrawStatusFilter", () => {
  it("accepts pending / approved / rejected (case-insensitive)", () => {
    expect(parseWithdrawStatusFilter("pending")).toBe("pending");
    expect(parseWithdrawStatusFilter("APPROVED")).toBe("approved");
    expect(parseWithdrawStatusFilter(" Rejected ")).toBe("rejected");
  });

  it("rejects unknown or empty values", () => {
    expect(parseWithdrawStatusFilter("")).toBeUndefined();
    expect(parseWithdrawStatusFilter(null)).toBeUndefined();
    expect(parseWithdrawStatusFilter("all")).toBeUndefined();
    expect(parseWithdrawStatusFilter("paid")).toBeUndefined();
  });
});

describe("withdrawListHref", () => {
  it("builds /withdraw with an optional status query", () => {
    expect(withdrawListHref()).toBe("/withdraw");
    expect(withdrawListHref("pending")).toBe("/withdraw?status=pending");
    expect(withdrawListHref("approved")).toBe("/withdraw?status=approved");
    expect(withdrawListHref("rejected")).toBe("/withdraw?status=rejected");
  });
});
