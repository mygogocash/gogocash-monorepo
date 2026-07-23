import { describe, expect, it } from "vitest";

import { MISSING_ORDER_STATUSES } from "./adminModules";

describe("Missing Conversions status contract", () => {
  it("matches the four statuses emitted by the canonical MissionOrder API", () => {
    expect(MISSING_ORDER_STATUSES).toEqual([
      "pending",
      "under_review",
      "approved",
      "rejected",
    ]);
    expect(MISSING_ORDER_STATUSES).not.toContain("info_requested");
  });
});
