import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const brandCardSource = fs.readFileSync(
  path.resolve(testDir, "../components/BrandLogoTile.tsx"),
  "utf8",
);

// Founder feedback 2026-07-11: Trending (compact S) logo tiles rendered with
// sharp corners on Android while Top Brands (L) tiles were rounded. The
// containers share the same radius + overflow hidden, but Android's new
// architecture does not reliably clip a child image to the parent's rounded
// corners — the radius must live on the expo-image itself.
describe("BrandCard compact logo corners (source parity)", () => {
  it("given the tile image > then it carries its own border radius (Android child-clip quirk)", () => {
    const imageBlock = brandCardSource.match(/logoImage: \{[^}]*\}/)?.[0];
    expect(imageBlock).toBeTruthy();
    expect(imageBlock).toContain("borderRadius: radii.sm");
  });

  it("given a non-square tile > then the image renders as a centered SQUARE so square bitmaps fill it edge-to-edge", () => {
    // Device-verified 2026-07-11: radius on a wider-than-tall viewport cannot
    // round a square bitmap that contentFit=contain insets — the sharp corners
    // are the BITMAP's own edges floating INSIDE the viewport. Square tiles
    // (aspectRatio 1) fill edge-to-edge and clip correctly.
    expect(brandCardSource).toContain("width: imageSquare");
  });
});
