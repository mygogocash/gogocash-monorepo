import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("discovery directory dark mode surfaces", () => {
  it("shop directory styles > given remote logos > then logo tile fills card background", () => {
    const styles = readMobileFile("src/screens/discovery/customerDiscoveryStyles.ts");
    const shopCard = readMobileFile("src/screens/discovery/ShopDirectoryStoreCard.tsx");

    expect(styles).toMatch(/shopDirectoryLogoImage:[\s\S]*absoluteFillObject/);
    // Card background only goes neutral once a logo is actually rendering —
    // failed/missing logos fall back to the brand tint + initials.
    expect(shopCard).toContain("const showLogo = Boolean(store.logoUri) && !logoFailed");
    expect(shopCard).toContain("showLogo ? colors.card : store.tint");
  });
});
