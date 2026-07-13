import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

/**
 * Issue #251 — floating white/blue refresh overlay blocking bottom nav.
 * Confirmed absent from app source; desktop LINE Official FAB is green and
 * desktop-home-only, not the reported control.
 */
describe("floating overlay contract (#251)", () => {
  it("app source has no floating white/blue refresh FAB", () => {
    const srcRoot = path.join(mobileRoot, "src");
    const hits: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "__tests__" || entry.name === "node_modules") {
            continue;
          }
          walk(full);
          continue;
        }
        if (!/\.(tsx|ts|jsx|js|html)$/.test(entry.name)) {
          continue;
        }
        const text = fs.readFileSync(full, "utf8");
        if (
          /floating.*refresh|refresh.*overlay|ReloadFab|PwaUpdate|updateAvailable/i.test(text) &&
          !full.includes("floating-overlay-contract")
        ) {
          hits.push(path.relative(mobileRoot, full));
        }
      }
    };

    walk(srcRoot);
    expect(hits).toEqual([]);
  });

  it("LINE Official FAB is green + desktop-only (not the reported refresh control)", () => {
    const fab = fs.readFileSync(
      path.join(mobileRoot, "src/components/CustomerLineOfficialFab.tsx"),
      "utf8",
    );
    expect(fab).toContain('backgroundColor: "#06C755"');
    const home = fs.readFileSync(path.join(mobileRoot, "src/screens/CustomerHomeScreen.tsx"), "utf8");
    // Rendered on desktop home branch only (after isDesktop early return content).
    expect(home).toContain("<CustomerLineOfficialFab");
    expect(home).not.toMatch(/MOBILE:[\s\S]*<CustomerLineOfficialFab/);
  });
});
