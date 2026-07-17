import { describe, expect, it } from "vitest";

import { validateCategoryName } from "./categoryNameValidation";

const categories = [
  { _id: "fashion-id", name: "Fashion" },
  { _id: "travel-id", name: "Travel" },
];

describe("policy category name validation (#318)", () => {
  it("rejects an empty trimmed draft", () => {
    expect(validateCategoryName("   ", categories)).toEqual({
      normalizedName: "",
      error: "Enter a category name.",
    });
  });

  it("rejects a duplicate name case-insensitively", () => {
    expect(validateCategoryName("  fAsHiOn  ", categories)).toEqual({
      normalizedName: "fAsHiOn",
      error: 'A category named "fAsHiOn" already exists.',
    });
  });

  it("rejects a Unicode NFKC-equivalent duplicate name", () => {
    expect(validateCategoryName("Ｆａｓｈｉｏｎ", categories)).toEqual({
      normalizedName: "Fashion",
      error: 'A category named "Fashion" already exists.',
    });
  });

  it("allows a rename to keep its own normalized name", () => {
    expect(validateCategoryName(" Fashion ", categories, "fashion-id")).toEqual(
      {
        normalizedName: "Fashion",
        error: null,
      },
    );
  });

  it("returns the trimmed unique name for persistence", () => {
    expect(validateCategoryName("  Electronics  ", categories)).toEqual({
      normalizedName: "Electronics",
      error: null,
    });
  });
});
