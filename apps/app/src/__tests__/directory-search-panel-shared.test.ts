import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "..");

const read = (relative: string) => fs.readFileSync(path.join(mobileRoot, relative), "utf8");

/**
 * The results search + "Sort by" + count block is one pattern across every
 * browse stage. /brand and /shops already shared it via the shopDirectory*
 * styles; the category stages had a hand-rolled copy with the label inline
 * instead of above the pills, so the same section read differently page to page.
 *
 * One component now backs all of them.
 */
const SCREENS_WITH_SEARCH_PANEL = [
  "screens/discovery/CustomerBrandDirectoryScreen.tsx",
  "screens/CustomerCategoryDetailScreen.tsx",
];

describe("directory search panel is shared", () => {
  it("DirectorySearchPanel > given the browse stages > exists as one component", () => {
    expect(fs.existsSync(path.join(mobileRoot, "screens/discovery/DirectorySearchPanel.tsx"))).toBe(
      true,
    );
  });

  for (const relative of SCREENS_WITH_SEARCH_PANEL) {
    it(`${relative} > given its results header > renders the shared panel`, () => {
      const source = read(relative);

      expect(source).toContain("<DirectorySearchPanel");
    });
  }

  it("category detail > given the shared panel > drops its hand-rolled filter card", () => {
    const source = read("screens/CustomerCategoryDetailScreen.tsx");

    expect(source).not.toContain("styles.filterCard");
    expect(source).not.toContain("styles.sortRow");
  });
});
