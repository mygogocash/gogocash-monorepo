import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./TopBrandManagementPanel.tsx", import.meta.url),
  "utf8",
);

describe("TopBrandManagementPanel issue #319 contract", () => {
  it("uses drag ordering without redundant arrows or active tag", () => {
    expect(source).not.toContain("ArrowUpIcon");
    expect(source).not.toContain("ArrowDownIcon");
    expect(source).not.toContain("Top Brands on");
  });

  it("renders derived cashback as read-only copy and displays the maximum", () => {
    expect(source).not.toContain("updateCashback");
    expect(source).toContain("Top brands selected:");
    expect(source).toContain("maxBrands");
  });
});
