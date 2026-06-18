import { describe, expect, it } from "vitest";

import { offerVisibilityStatusLabel } from "./OffersTable";

describe("offerVisibilityStatusLabel", () => {
  it("maps disabled offers to admin-facing hidden/live wording", () => {
    expect(offerVisibilityStatusLabel(true)).toBe("Hidden");
    expect(offerVisibilityStatusLabel(false)).toBe("Live");
  });
});
