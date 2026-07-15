import { describe, expect, it } from "vitest";

import {
  CUSTOM_POLICY_CATEGORY_ID,
  inferOfferPolicyMode,
} from "./offerPolicyMode";
import { resolveConfiguredOfferPolicyTerms } from "./offerPolicyTerms";

describe("offer policy authoring mode (#310)", () => {
  it("infers Custom Writing only from the persisted custom sentinel", () => {
    expect(inferOfferPolicyMode(CUSTOM_POLICY_CATEGORY_ID)).toBe("custom");
    expect(inferOfferPolicyMode("68345f00aa11bb22cc33dd99")).toBe("template");
    expect(inferOfferPolicyMode("")).toBe("template");
  });

  it("returns configured template text without substituting mock terms", () => {
    const categories = [{ _id: "shopping-id", name: "Shopping" }];

    expect(
      resolveConfiguredOfferPolicyTerms("shopping-id", "Shopping", categories, {
        "shopping-id": "  Configured shopping policy  ",
      }),
    ).toBe("Configured shopping policy");
    expect(
      resolveConfiguredOfferPolicyTerms(
        "shopping-id",
        "Shopping",
        categories,
        {},
      ),
    ).toBe("");
  });
});
