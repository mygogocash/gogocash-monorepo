/** @vitest-environment happy-dom */

import { beforeEach, describe, expect, it } from "vitest";

import {
  appendPointTransaction,
  buildPointTransactionRecord,
  loadPointTransactions,
  savePointTransactions,
} from "./pointTransactionStorage";

describe("pointTransactionStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("buildPointTransactionRecord > sets givenAt only when status is Given", () => {
    const given = buildPointTransactionRecord({
      pointName: "Quest 202602",
      pointAmount: 50,
      pointUser: "user@example.com",
      formStatus: "Given",
      apiSuccess: true,
      now: new Date("2026-06-24T10:00:00.000Z"),
    });
    expect(given.payoutStatus).toBe("Given");
    expect(given.givenAt).toBe("2026-06-24T10:00:00.000Z");

    const scheduled = buildPointTransactionRecord({
      pointName: "Quest 202602",
      pointAmount: 50,
      pointUser: "user@example.com",
      formStatus: "Schedule",
      apiSuccess: true,
      now: new Date("2026-06-24T10:00:00.000Z"),
    });
    expect(scheduled.payoutStatus).toBe("Schedule");
    expect(scheduled.givenAt).toBeNull();
  });

  it("appendPointTransaction > persists newest-first entries", () => {
    savePointTransactions([]);
    appendPointTransaction(
      buildPointTransactionRecord({
        pointName: "A",
        pointAmount: 1,
        pointUser: "a@example.com",
        formStatus: "Pending",
        apiSuccess: true,
      }),
    );
    appendPointTransaction(
      buildPointTransactionRecord({
        pointName: "B",
        pointAmount: 2,
        pointUser: "b@example.com",
        formStatus: "Given",
        apiSuccess: true,
      }),
    );
    expect(loadPointTransactions().map((row) => row.pointName)).toEqual([
      "B",
      "A",
    ]);
  });
});
