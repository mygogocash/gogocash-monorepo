import { StyleSheet } from "react-native";
import { describe, expect, it } from "vitest";

import { createAccountPageShellStyles } from "@mobile/components/AccountPageShell";
import { mobileShellLayout } from "@mobile/design/webDesignParity";
import { createCategoryDetailScreenStyles } from "@mobile/screens/CustomerCategoryDetailScreen";
import { createShopDetailScreenStyles } from "@mobile/screens/CustomerShopDetailScreen";
import { createDiscoveryScreenStyles } from "@mobile/screens/discovery/customerDiscoveryStyles";
import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { lightColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";

/**
 * Every desktop page renders its content inside a `desktopContentCap`. Outside the
 * home page these shipped as bare `{ alignSelf, width }` — no top padding, no gap —
 * so the page title sat flush against the sticky header and each section sat flush
 * against the next. Measured on /brand before the fix: header bottom 118 / content
 * top 118, and title block bottom 230 / next section top 230. Both gaps 0px.
 *
 * Founder spec: 40px header→content, 24px between sections, on every page except home.
 */
const surfaces = getThemeSurfaces(lightColors, "light");

const flatten = (style: unknown) => StyleSheet.flatten(style) as Record<string, unknown>;

const SHELLS: readonly { name: string; cap: Record<string, unknown> }[] = [
  {
    name: "discovery directories (/brand, /shops, category, product discovery)",
    cap: flatten(createDiscoveryScreenStyles(lightColors).desktopContentCap),
  },
  {
    name: "shop detail",
    cap: flatten(createShopDetailScreenStyles(lightColors).desktopContentCap),
  },
  {
    name: "category detail",
    cap: flatten(createCategoryDetailScreenStyles(lightColors).desktopContentCap),
  },
  {
    name: "account pages",
    cap: flatten(createAccountPageShellStyles(lightColors, surfaces).desktopContentCap),
  },
];

describe("desktop page shell spacing", () => {
  for (const { name, cap } of SHELLS) {
    it(`${name} > given the desktop shell > clears the sticky header by 40px`, () => {
      expect(cap.paddingTop).toBe(mobileShellLayout.desktopPageTopGap);
      expect(cap.paddingTop).toBe(40);
    });

    it(`${name} > given stacked content sections > separates them by 24px`, () => {
      expect(cap.gap).toBe(mobileShellLayout.desktopPageSectionGap);
      expect(cap.gap).toBe(24);
    });
  }

  it("home > given its own hero-led rhythm > keeps the wider desktopHomeStackGap", () => {
    const cap = flatten(createHomeScreenStyles(lightColors, surfaces).desktopContentCap);

    // Home is deliberately excluded: it has a hero and its own 64/40 spec.
    expect(cap.gap).toBe(mobileShellLayout.desktopHomeStackGap);
    expect(cap.gap).not.toBe(mobileShellLayout.desktopPageSectionGap);
  });
});
