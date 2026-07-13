import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../screens/home/DetectedRegionBanner.tsx"),
  "utf8",
);

describe("DetectedRegionBanner — header contrast (founder feedback)", () => {
  it("banner text is white like the sibling header copy, regardless of theme", () => {
    // The banner sits on the always-green header gradient, so its ink must be
    // constant white (like mobileTabletHeaderSubcopy's rgba(255,255,255,0.88))
    // — the old theme-aware dark ink (#303846) was unreadable in light mode.
    expect(source).not.toContain("#303846");
    const textBlock = source.match(/bannerText:\s*\{[\s\S]*?\},/)?.[0] ?? "";
    expect(textBlock).toContain('color: "rgba(255, 255, 255,');
  });

  it("the Change action is white too, not theme primary", () => {
    const changeBlock = source.match(/bannerChangeText:\s*\{[\s\S]*?\},/)?.[0] ?? "";
    expect(changeBlock).toContain('color: "#FFFFFF"');
  });
});
