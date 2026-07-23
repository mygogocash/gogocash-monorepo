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
  it("brand logo tile > given remote logos > then logo tile fills card background", () => {
    // Both directories now render the shared BrandCard, so this behaviour lives in
    // BrandLogoTile rather than the retired per-directory card components.
    const tile = readMobileFile("src/components/BrandLogoTile.tsx");

    // Card background only goes neutral once a logo is actually rendering —
    // failed/missing logos fall back to the brand tint + initials.
    expect(tile).toContain("const showImage = source !== null && !logoFailed");
    expect(tile).toMatch(/backgroundColor: showImage \?[\s\S]*?: tint/);
  });
});
