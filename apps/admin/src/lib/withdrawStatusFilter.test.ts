import { describe, expect, it } from "vitest";

import {
  WITHDRAW_STATUS_FILTER_OPTIONS,
  hasInvalidWithdrawStatusParam,
  parseWithdrawStatusFilter,
  withdrawListHref,
  withdrawPathWithStatus,
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

describe("withdrawPathWithStatus", () => {
  it("sets status and preserves sibling params", () => {
    expect(withdrawPathWithStatus("method=web3&page=2", "pending")).toBe(
      "/withdraw?method=web3&page=2&status=pending",
    );
  });

  it("clears status when undefined", () => {
    expect(withdrawPathWithStatus("?status=pending&method=web3", undefined)).toBe(
      "/withdraw?method=web3",
    );
    expect(withdrawPathWithStatus("status=approved", undefined)).toBe(
      "/withdraw",
    );
  });
});

describe("hasInvalidWithdrawStatusParam", () => {
  it("detects unknown status tokens only", () => {
    expect(hasInvalidWithdrawStatusParam(null)).toBe(false);
    expect(hasInvalidWithdrawStatusParam("")).toBe(false);
    expect(hasInvalidWithdrawStatusParam("pending")).toBe(false);
    expect(hasInvalidWithdrawStatusParam("paid")).toBe(true);
  });
});

describe("WITHDRAW_STATUS_FILTER_OPTIONS", () => {
  it("includes All plus every parsed status value", () => {
    expect(WITHDRAW_STATUS_FILTER_OPTIONS.map((o) => o.value)).toEqual([
      "",
      "pending",
      "approved",
      "rejected",
    ]);
  });
});
