import { describe, expect, it } from "vitest";

import {
  mergeGogoquestHistoryMessages,
  pickGogoquestHistoryMessages,
} from "./gogoquestHistoryMerge";

describe("gogoquestHistoryMerge", () => {
  it("includes insight title in en patch", () => {
    const patch = pickGogoquestHistoryMessages("en");
    expect(patch.gogoquestHistoryInsightTitle).toBeTruthy();
    expect(typeof patch.gogoquestHistoryInsightTitle).toBe("string");
  });

  it("merges patch over base when keys missing", () => {
    const out = mergeGogoquestHistoryMessages(
      { otherKey: "x" } as Record<string, unknown>,
      "en"
    ) as Record<string, unknown>;
    expect(out.otherKey).toBe("x");
    expect(typeof out.gogoquestHistoryInsightTitle).toBe("string");
  });
});
