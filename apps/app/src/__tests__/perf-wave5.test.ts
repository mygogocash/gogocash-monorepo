import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  getFavoriteBrandCardHeight,
  getFavoriteBrandGridMetrics,
} from "../screens/favoriteBrandGrid";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const secondaryCopyFiles = [
  "src/components/BrandCard.tsx",
  "src/components/ShopRedirectOverlay.tsx",
  "src/screens/CustomerAccountSettingsScreen.tsx",
  "src/screens/CustomerCategoryDetailScreen.tsx",
  "src/screens/CustomerCreditScoreScreen.tsx",
  "src/screens/CustomerFavoriteBrandsScreen.tsx",
  "src/screens/CustomerMissingOrdersScreen.tsx",
  "src/screens/CustomerMoneyActionScreen.tsx",
  "src/screens/CustomerMyCashbackSignInScreen.tsx",
  "src/screens/CustomerProfilePhoneScreen.tsx",
  "src/screens/CustomerQuestScreen.tsx",
  "src/screens/CustomerWalletScreen.tsx",
  "src/screens/discovery/customerDiscoveryStyles.ts",
  "src/screens/discovery/ShopDirectoryPagination.tsx",
];

describe("secondary copy contrast — textSoft → muted (Wave 2 remainder)", () => {
  it.each(secondaryCopyFiles)("%s does not use colors.textSoft for secondary copy", (relativePath) => {
    const source = readMobileFile(relativePath);

    expect(source).not.toMatch(/color: colors\.textSoft/);
    expect(source).not.toMatch(/placeholderTextColor=\{colors\.textSoft\}/);
    expect(source).not.toMatch(/color=\{colors\.textSoft\}/);
  });
});

describe("favorite brands grid virtualization", () => {
  it("CustomerFavoriteBrandsScreen > given brand lists > then uses DirectoryVirtualizedGrid", () => {
    const favoriteSource = readMobileFile("src/screens/CustomerFavoriteBrandsScreen.tsx");

    expect(favoriteSource).toContain("FavoriteBrandsVirtualizedGrid");
    expect(favoriteSource).toContain("DirectoryVirtualizedGrid");
    expect(favoriteSource).toMatch(/const FavoriteBrandCard = memo\(/);
    expect(favoriteSource).not.toMatch(/brands\.map\(\(brand\) =>[\s\S]*?<FavoriteBrandCard/);
  });

  it("favoriteBrandGrid > given content width > then derives column metrics", () => {
    const mobile = getFavoriteBrandGridMetrics(360, false);
    expect(mobile.columns).toBe(2);
    expect(mobile.cardWidth).toBeGreaterThan(160);

    const desktop = getFavoriteBrandGridMetrics(1200, true);
    expect(desktop.columns).toBeGreaterThanOrEqual(2);
    expect(getFavoriteBrandCardHeight(mobile.cardWidth)).toBeGreaterThan(180);
  });
});

describe("web bundle baseline (Wave 0)", () => {
  it("measure script and committed baseline exist with a sane JS payload record", () => {
    const scriptPath = path.join(mobileRoot, "scripts/measure-web-bundle.mjs");
    const baselinePath = path.join(mobileRoot, "scripts/baselines/web-bundle-baseline.json");

    expect(fs.existsSync(scriptPath)).toBe(true);

    const packageJson = JSON.parse(readMobileFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(packageJson.scripts?.["measure:bundle"]).toContain("measure-web-bundle.mjs");

    expect(fs.existsSync(baselinePath)).toBe(true);
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as {
      totalJsBytes: number;
      totalJsFiles: number;
      platform: string;
      topChunks: Array<{ bytes: number; path: string }>;
    };

    expect(baseline.platform).toBe("web");
    expect(baseline.totalJsBytes).toBeGreaterThan(500_000);
    expect(baseline.totalJsFiles).toBeGreaterThan(0);
    expect(baseline.topChunks.length).toBeGreaterThan(0);
  });
});
