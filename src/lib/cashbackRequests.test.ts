import { describe, it, expect } from "vitest";
import { pendingExtraCashbackRequests } from "./cashbackRequests";

describe("pendingExtraCashbackRequests", () => {
  const rows = [
    {
      conversion_id: 1,
      offer_name: "Extra cashback",
      conversion_status: "pending",
      payout: 50,
    },
    {
      conversion_id: 2,
      offer_name: "Extra cashback",
      conversion_status: "approved",
      payout: 60,
    },
    {
      conversion_id: 3,
      offer_name: "AirAsia Travel - CPS",
      conversion_status: "pending",
      payout: 70,
    },
    {
      conversion_id: 4,
      offer_name: "Extra cashback",
      conversion_status: "pending",
      payout: 80,
    },
  ];

  it("given mixed conversions > returns only pending Extra cashback", () => {
    expect(
      pendingExtraCashbackRequests(rows).map((c) => c.conversion_id),
    ).toEqual([1, 4]);
  });

  it("given a pending non-extra-cashback conversion > excludes it", () => {
    expect(pendingExtraCashbackRequests([rows[2]])).toEqual([]);
  });

  it("given an approved extra cashback > excludes it", () => {
    expect(pendingExtraCashbackRequests([rows[1]])).toEqual([]);
  });

  it("given no conversions > returns empty", () => {
    expect(pendingExtraCashbackRequests([])).toEqual([]);
  });
});
