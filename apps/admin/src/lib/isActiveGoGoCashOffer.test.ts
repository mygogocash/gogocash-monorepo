import { describe, expect, it } from "vitest";
import { isActiveGoGoCashOffer } from "./isActiveGoGoCashOffer";

describe("isActiveGoGoCashOffer", () => {
  it("given a live offer > then returns true", () => {
    expect(
      isActiveGoGoCashOffer({ disabled: false, status: "approved" }),
    ).toBe(true);
  });

  it("given a hidden offer > then returns false", () => {
    expect(isActiveGoGoCashOffer({ disabled: true, status: "approved" })).toBe(
      false,
    );
  });

  it("given pending review or rejected > then returns false", () => {
    expect(
      isActiveGoGoCashOffer({ disabled: false, status: "pending_review" }),
    ).toBe(false);
    expect(
      isActiveGoGoCashOffer({ disabled: false, status: "rejected" }),
    ).toBe(false);
  });
});
