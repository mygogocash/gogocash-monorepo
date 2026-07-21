import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  webBrowseShortcuts,
  webDesktopHeaderNavItems,
} from "@mobile/design/webDesignParity";
import { shortcutIcons, desktopNavIcons } from "@mobile/screens/home/homeAssets";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(mobileRoot, rel), "utf8");

// #497 (remaining half) — the bar renders now, but two asks were still open:
//   1. PLACEMENT: it sat in the mobile header ABOVE the banner block; the ticket asks for
//      it between the banner section and Top Brands.
//   2. PARITY: it carried 4 destinations while the desktop nav carried 7, so "taps route to
//      the same destinations as desktop" did not hold.
describe("mobile explore bar placement and parity (#497)", () => {
  it("given the mobile home stack > then the bar sits between the banners and Top Brands", () => {
    const home = read("src/screens/CustomerHomeScreen.tsx");

    const banners = home.indexOf("<HomeHeroBanners");
    const shortcuts = home.indexOf("<BrowseShortcuts");
    const topBrands = home.indexOf("<TopBrandSection");

    expect(banners).toBeGreaterThan(-1);
    expect(shortcuts).toBeGreaterThan(-1);
    expect(topBrands).toBeGreaterThan(-1);
    // Order in the shared homeSections stack IS the render order.
    expect(shortcuts).toBeGreaterThan(banners);
    expect(shortcuts).toBeLessThan(topBrands);
  });

  it("given the mobile header > then it no longer owns the shortcut dock", () => {
    // Leaving a second copy in the header would render the bar twice on mobile.
    expect(read("src/screens/home/MobileTabletHomeHeader.tsx")).not.toContain(
      "<BrowseShortcuts",
    );
  });

  it("given the explore bar > then it reaches exactly the desktop destinations", () => {
    expect(webBrowseShortcuts.map((s) => s.href)).toEqual(
      webDesktopHeaderNavItems.map((n) => n.href),
    );
    expect(webBrowseShortcuts.map((s) => s.label)).toEqual(
      webDesktopHeaderNavItems.map((n) => n.label),
    );
  });

  it("given every explore bar item > then it has a real icon, not the generic fallback", () => {
    // ShortcutIcon falls back to a shopping bag for unknown names, so a missing icon is
    // silent — four identical bags rather than an error.
    const missing = webBrowseShortcuts
      .map((s) => s.icon)
      .filter((name) => !(name in shortcutIcons) && !(name in desktopNavIcons));

    expect(missing).toEqual([]);
  });
});
