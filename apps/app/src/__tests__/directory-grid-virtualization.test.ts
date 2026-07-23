import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { readDiscoverySources } from "../test-support/discoverySource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("directory grid virtualization (Wave 1 perf)", () => {
  it("BrandCard > given shared compact card > then export is wrapped in React.memo", () => {
    const brandCardSource = readMobileFile("src/components/BrandCard.tsx");

    expect(brandCardSource).toContain("memo(");
    expect(brandCardSource).toMatch(/export const BrandCard = memo\(/);
  });

  it("CustomerDiscoveryScreen > given directory grids > then brand shop and product grids use FlashList", () => {
    const discoverySource = readDiscoverySources(mobileRoot);

    expect(discoverySource).toContain('@shopify/flash-list');
    expect(discoverySource).toContain("DirectoryVirtualizedGrid");
    expect(discoverySource).toContain("<DirectoryVirtualizedGrid");
    expect(discoverySource).not.toMatch(
      /visibleBrands\.map\(\(store\) =>[\s\S]*?<BrandCard/
    );
    expect(discoverySource).not.toMatch(
      /visibleStores\.map\(\(store\) =>[\s\S]*?<BrandCard/
    );
    expect(discoverySource).not.toMatch(
      /visibleProducts\.map\(\(product\) =>[\s\S]*?<ProductDiscoveryCard/
    );
  });

  it("CustomerDiscoveryScreen > given directory row cards > then store and product cards use React.memo", () => {
    const discoverySource = readDiscoverySources(mobileRoot);

    // Both directories render the shared BrandCard, which is memoised at source.
    const brandCard = readMobileFile("src/components/BrandCard.tsx");
    expect(brandCard).toMatch(/export const BrandCard = memo\(/);
    expect(discoverySource).toMatch(/const ProductDiscoveryCard = memo\(/);
  });

  it("package > given Expo SDK 57 app > then @shopify/flash-list is declared", () => {
    const packageJson = JSON.parse(
      readMobileFile("package.json")
    ) as { dependencies?: Record<string, string> };

    expect(packageJson.dependencies?.["@shopify/flash-list"]).toBeTruthy();
  });
});
