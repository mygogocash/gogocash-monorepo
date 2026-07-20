import { describe, it, expect } from "vitest";
import {
  CATEGORY_ICON_KEYS,
  categoryIconKey,
  resolveCategoryIconKey,
} from "./CategoryIcon";

describe("categoryIconKey", () => {
  it("maps known categories to their related icon (case-insensitive)", () => {
    expect(categoryIconKey("Shopping")).toBe("shopping");
    expect(categoryIconKey("Travel")).toBe("travel");
    expect(categoryIconKey("Food & Drink")).toBe("food");
    expect(categoryIconKey("Finance")).toBe("finance");
    expect(categoryIconKey("Entertainment")).toBe("entertainment");
  });

  it("matches on keywords inside longer names", () => {
    expect(categoryIconKey("Online Shopping Deals")).toBe("shopping");
    expect(categoryIconKey("Banking & Insurance")).toBe("finance");
    expect(categoryIconKey("Food court")).toBe("food");
    expect(categoryIconKey("Movies & Music")).toBe("entertainment");
  });

  it("maps the expanded category icons by keyword", () => {
    expect(categoryIconKey("Electronics & Gadgets")).toBe("electronics");
    expect(categoryIconKey("Mobile Phones")).toBe("electronics");
    expect(categoryIconKey("Fashion & Apparel")).toBe("fashion");
    expect(categoryIconKey("Shoes & Clothing")).toBe("fashion");
    expect(categoryIconKey("Beauty & Cosmetics")).toBe("beauty");
    expect(categoryIconKey("Skincare")).toBe("beauty");
    expect(categoryIconKey("Health & Pharmacy")).toBe("health");
    expect(categoryIconKey("Home & Living")).toBe("home");
    expect(categoryIconKey("Furniture")).toBe("home");
    expect(categoryIconKey("Education & Courses")).toBe("education");
    expect(categoryIconKey("Gifting & Crafts")).toBe("gift");
    expect(categoryIconKey("Sports & Fitness")).toBe("sports");
    expect(categoryIconKey("Pet Supplies")).toBe("pets");
    expect(categoryIconKey("Baby & Kids")).toBe("baby");
    expect(categoryIconKey("Auto Parts")).toBe("auto");
    expect(categoryIconKey("Digital Services")).toBe("services");
    expect(categoryIconKey("Top-up / Recharge")).toBe("services");
  });

  it("falls back to default for unknown / empty names", () => {
    expect(categoryIconKey("Miscellaneous")).toBe("default");
    expect(categoryIconKey("")).toBe("default");
  });

  it("prefers a persisted allow-listed icon and rejects untrusted values", () => {
    expect(resolveCategoryIconKey("finance", "Shopping")).toBe("finance");
    expect(resolveCategoryIconKey("electronics", "Shopping")).toBe(
      "electronics",
    );
    expect(resolveCategoryIconKey("gift", "Shopping")).toBe("gift");
    expect(resolveCategoryIconKey("<script>", "Shopping")).toBe("shopping");
    expect(CATEGORY_ICON_KEYS).toEqual([
      "shopping",
      "travel",
      "food",
      "finance",
      "entertainment",
      "electronics",
      "fashion",
      "beauty",
      "health",
      "home",
      "education",
      "gift",
      "sports",
      "pets",
      "baby",
      "auto",
      "services",
      "default",
    ]);
  });
});
