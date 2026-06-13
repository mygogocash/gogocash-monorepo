import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOW_IT_WORKS_ILLUSTRATION_PATHS,
  howItWorksIllustrationSrc,
} from "./how-it-works-illustrations";

describe("how-it-works-illustrations", () => {
  it("exposes exactly three step illustrations in order", () => {
    assert.equal(HOW_IT_WORKS_ILLUSTRATION_PATHS.length, 3);
    assert.ok(
      HOW_IT_WORKS_ILLUSTRATION_PATHS[0].includes("browse-and-pick-your-brand"),
    );
    assert.ok(
      HOW_IT_WORKS_ILLUSTRATION_PATHS[2].includes(
        "cashback-after-the-merchant-confirms",
      ),
    );
  });

  it("returns undefined for out-of-range step index", () => {
    assert.equal(howItWorksIllustrationSrc(99), undefined);
  });
});
