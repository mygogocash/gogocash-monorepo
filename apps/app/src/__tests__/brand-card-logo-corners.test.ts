import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const brandCardSource = fs.readFileSync(
  path.resolve(testDir, "../components/BrandCard.tsx"),
  "utf8",
);

// Founder feedback 2026-07-11: Trending (compact S) logo tiles rendered with
// sharp corners on Android while Top Brands (L) tiles were rounded. The
// containers share the same radius + overflow hidden, but Android's new
// architecture does not reliably clip a child image to the parent's rounded
// corners — the radius must live on the expo-image itself.
describe("BrandCard compact logo corners (source parity)", () => {
  it("given the compact logo image > then it carries its own border radius (Android child-clip quirk)", () => {
    const compactImageBlock = brandCardSource.match(
      /compactBrandLogoImage: \{[^}]*\}/,
    )?.[0];
    expect(compactImageBlock).toBeTruthy();
    expect(compactImageBlock).toContain("borderRadius: radii.sm");
  });

  it("given the L logo image > then it carries the same radius so both tiers clip identically", () => {
    const largeImageBlock = brandCardSource.match(/brandLogoImage: \{[^}]*\}/)?.[0];
    expect(largeImageBlock).toBeTruthy();
    expect(largeImageBlock).toContain("borderRadius: radii.sm");
  });
});
