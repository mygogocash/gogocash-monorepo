import { describe, it, expect } from "vitest";
import { categoryIconKey } from "./CategoryIcon";

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

  it("falls back to default for unknown / empty names", () => {
    expect(categoryIconKey("Electronics")).toBe("default");
    expect(categoryIconKey("")).toBe("default");
  });
});
