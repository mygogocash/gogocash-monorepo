import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

function styleBlock(source: string, name: string) {
  const match = source.match(new RegExp(`${name}:\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? null;
}

// Sort-chip typography parity: every "Sort by" chip across the listing screens reads
// the same as the web app's sort pills — text-sm font-semibold => fontSize 14 / weight 600.
// Previously the Discovery sort bars diverged (products 13/700, brands & shops 12/400)
// from the category screen (14/600). They now share a single directorySortPillText style.
describe("sort-chip typography parity (14 / 600, web parity)", () => {
  it("Discovery > given the brand/product/shop sort bars > then all three use the unified directorySortPillText", () => {
    const discovery = readMobileFile("src/screens/CustomerDiscoveryScreen.tsx");
    // \b after the name excludes the ...Active variant, so this counts only the base refs.
    const refs = discovery.match(/styles\.directorySortPillText\b/g) ?? [];
    expect(refs.length).toBeGreaterThanOrEqual(3);
  });

  it("Discovery > given the unified sort-chip style > then it is fontSize 14 / fontWeight 600", () => {
    const discovery = readMobileFile("src/screens/CustomerDiscoveryScreen.tsx");
    const block = styleBlock(discovery, "directorySortPillText");
    expect(block, "directorySortPillText style should exist").not.toBeNull();
    expect(block).toContain("fontSize: 14");
    expect(block).toContain('fontWeight: "600"');
  });

  it("CategoryDetail > given its sort pill text > then it matches the same 14 / 600 pattern", () => {
    const category = readMobileFile("src/screens/CustomerCategoryDetailScreen.tsx");
    const block = styleBlock(category, "sortPillText");
    expect(block, "sortPillText style should exist").not.toBeNull();
    expect(block).toContain("fontSize: 14");
    expect(block).toContain('fontWeight: "600"');
  });
});
