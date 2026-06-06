import { describe, it, expect } from "vitest";
import { sortBilling, filterBilling } from "./billingSort";

const rows = [
  {
    date: "2026-06-05",
    amount: 149,
    benefit: "GoGoPass Plus",
    method: "Credit card",
    status: "paid",
  },
  {
    date: "2026-09-03",
    amount: 50,
    benefit: "Monthly Sub",
    method: "Cash",
    status: "scheduled",
  },
  {
    date: "2026-06-20",
    amount: 300,
    benefit: "Annual Sub",
    method: "Card",
    status: "paid",
  },
];

describe("sortBilling", () => {
  it("given date-desc > orders newest date first", () => {
    expect(sortBilling(rows, "date-desc").map((r) => r.date)).toEqual([
      "2026-09-03",
      "2026-06-20",
      "2026-06-05",
    ]);
  });

  it("given date-asc > orders oldest date first", () => {
    expect(sortBilling(rows, "date-asc").map((r) => r.date)).toEqual([
      "2026-06-05",
      "2026-06-20",
      "2026-09-03",
    ]);
  });

  it("given amount-desc > orders highest amount first", () => {
    expect(sortBilling(rows, "amount-desc").map((r) => r.amount)).toEqual([
      300, 149, 50,
    ]);
  });

  it("given amount-asc > orders lowest amount first", () => {
    expect(sortBilling(rows, "amount-asc").map((r) => r.amount)).toEqual([
      50, 149, 300,
    ]);
  });

  it("given benefit > orders benefit name A–Z", () => {
    expect(sortBilling(rows, "benefit").map((r) => r.benefit)).toEqual([
      "Annual Sub",
      "GoGoPass Plus",
      "Monthly Sub",
    ]);
  });

  it("given method > orders payment method A–Z", () => {
    expect(sortBilling(rows, "method").map((r) => r.method)).toEqual([
      "Card",
      "Cash",
      "Credit card",
    ]);
  });

  it("given status > orders status A–Z", () => {
    expect(sortBilling(rows, "status").map((r) => r.status)).toEqual([
      "paid",
      "paid",
      "scheduled",
    ]);
  });

  it("does not mutate the input array", () => {
    const original = [...rows];
    sortBilling(rows, "amount-desc");
    expect(rows).toEqual(original);
  });
});

describe("filterBilling", () => {
  it("given an empty value > returns all rows (All)", () => {
    expect(filterBilling(rows, "benefit", "")).toEqual(rows);
  });

  it("given a benefit > returns only rows with that benefit", () => {
    expect(
      filterBilling(rows, "benefit", "Monthly Sub").map((r) => r.benefit),
    ).toEqual(["Monthly Sub"]);
  });

  it("given a payment method > returns only rows with that method", () => {
    expect(filterBilling(rows, "method", "Cash").map((r) => r.method)).toEqual([
      "Cash",
    ]);
  });

  it("given a status > returns every row with that status", () => {
    expect(filterBilling(rows, "status", "paid").map((r) => r.benefit)).toEqual(
      ["GoGoPass Plus", "Annual Sub"],
    );
  });

  it("given a value not present > returns an empty array", () => {
    expect(filterBilling(rows, "status", "failed")).toEqual([]);
  });
});
