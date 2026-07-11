import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const questFile = "src/screens/CustomerQuestScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer quest dark mode surfaces", () => {
  it("quest leaderboard accents > given dark theme > then use themed primary tokens", () => {
    const source = readMobileFile(questFile);

    expect(source).toMatch(/historyDaysLeftText:[\s\S]*color: colors\.primaryDark/);
    expect(source).toMatch(/rankViewText:[\s\S]*color: colors\.primaryDark/);
    expect(source).not.toMatch(/historyDaysLeftText:[\s\S]*color: "#007D5E"/);
    expect(source).not.toMatch(/rankViewText:[\s\S]*color: "#00AA80"/);
  });

  it("quest explore shops > given remote logos > then the shared tile owns the card-background + contain behavior", () => {
    // 2026-07-11 tile convergence: quest renders the shared BrandCard, whose
    // BrandLogoTile switches card background vs tint and renders expo-image
    // with contentFit=contain — pinned at the tile, once, for every surface.
    const source = readMobileFile(questFile);
    expect(source).toContain("<BrandCard");

    const tile = readMobileFile("src/components/BrandLogoTile.tsx");
    expect(tile).toContain("showImage ? styles.tileCardBackground.backgroundColor : tint");
    expect(tile).toContain('contentFit="contain"');
  });
});
