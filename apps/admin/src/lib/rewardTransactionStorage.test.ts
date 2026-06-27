/** @vitest-environment happy-dom */

import { beforeEach, describe, expect, it } from "vitest";

import {
  appendRewardTransaction,
  buildRewardTransactionRecord,
  loadRewardTransactions,
  resolveRewardPayoutStatus,
  saveRewardTransactions,
} from "./rewardTransactionStorage";

describe("rewardTransactionStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("resolveRewardPayoutStatus > keeps form status on API success and Fail on error", () => {
    expect(resolveRewardPayoutStatus("Given", true)).toBe("Given");
    expect(resolveRewardPayoutStatus("Schedule", true)).toBe("Schedule");
    expect(resolveRewardPayoutStatus("Pending", true)).toBe("Pending");
    expect(resolveRewardPayoutStatus("Given", false)).toBe("Fail");
  });

  it("buildRewardTransactionRecord > sets givenAt only when status is Given", () => {
    const given = buildRewardTransactionRecord({
      rewardName: "Quest 202602",
      rewardAmount: 10,
      rewardCurrency: "THB",
      rewardUser: "user@example.com",
      formStatus: "Given",
      apiSuccess: true,
      now: new Date("2026-06-24T10:00:00.000Z"),
    });
    expect(given.payoutStatus).toBe("Given");
    expect(given.givenAt).toBe("2026-06-24T10:00:00.000Z");

    const scheduled = buildRewardTransactionRecord({
      rewardName: "Quest 202602",
      rewardAmount: 10,
      rewardCurrency: "THB",
      rewardUser: "user@example.com",
      formStatus: "Schedule",
      apiSuccess: true,
      now: new Date("2026-06-24T10:00:00.000Z"),
    });
    expect(scheduled.payoutStatus).toBe("Schedule");
    expect(scheduled.givenAt).toBeNull();

    const pending = buildRewardTransactionRecord({
      rewardName: "Quest 202602",
      rewardAmount: 10,
      rewardCurrency: "THB",
      rewardUser: "user@example.com",
      formStatus: "Pending",
      apiSuccess: true,
      now: new Date("2026-06-24T10:00:00.000Z"),
    });
    expect(pending.payoutStatus).toBe("Pending");
    expect(pending.givenAt).toBeNull();
  });

  it("appendRewardTransaction > persists newest-first entries", () => {
    saveRewardTransactions([]);
    const first = buildRewardTransactionRecord({
      rewardName: "A",
      rewardAmount: 1,
      rewardCurrency: "THB",
      rewardUser: "a@example.com",
      formStatus: "Pending",
      apiSuccess: true,
    });
    appendRewardTransaction(first);
    const second = buildRewardTransactionRecord({
      rewardName: "B",
      rewardAmount: 2,
      rewardCurrency: "THB",
      rewardUser: "b@example.com",
      formStatus: "Given",
      apiSuccess: true,
    });
    appendRewardTransaction(second);
    expect(loadRewardTransactions().map((row) => row.rewardName)).toEqual([
      "B",
      "A",
    ]);
  });
});
