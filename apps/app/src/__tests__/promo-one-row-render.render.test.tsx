import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromoSection } from "@mobile/screens/home/PromoSection";
import { HomeScreenThemeProvider } from "@mobile/screens/home/homeScreenHooks";
import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { getResponsiveHomeLayoutMetrics } from "@mobile/design/webDesignParity";
import { lightColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";

// #499 acceptance criterion 6 — "Travel/Makeup rendering".
//
// promo-one-row-height.render.test.tsx covers the HELPERS (getPromoSectionRowsPerPage /
// GridHeight / PageSize) but never mounts PromoSection, so it cannot catch the section
// reading the wrong height. That is the exact shape of the #497 bug: helpers correct,
// component still wired to the old value, every test green.
//
// This file mounts the real component and reads the height it actually emits into the
// DOM. Note the repo's `.render.test.tsx` suffix denotes the happy-dom suite rather than
// "mounts something" — several files carrying it assert on pure functions.
const layout = getResponsiveHomeLayoutMetrics(1404);

function card(n: number) {
  return {
    brand: `Brand ${n}`,
    cashback: "4.1%",
    category: "Travel",
    href: `/shop/${n}`,
    logoUri: undefined,
    tint: "#eeeeee",
  };
}

// PromoSection reads its styles from HomeScreenThemeContext, which CustomerHomeScreen
// normally supplies — so the test has to stand that context up itself.
const surfaces = getThemeSurfaces(lightColors, "light");
const homeTheme = {
  colors: lightColors,
  styles: createHomeScreenStyles(lightColors, surfaces),
  surfaces,
};

function mount(id: string, cardCount: number) {
  return render(
    createElement(
      HomeScreenThemeProvider,
      { value: homeTheme } as never,
      createElement(PromoSection, {
        cards: Array.from({ length: cardCount }, (_, i) => card(i)),
        homeLayout: layout,
        id,
        link: "/brand",
        title: id,
      } as never),
    ),
  );
}

/** Every inline pixel height the section emitted, deduped. */
function emittedHeights(container: HTMLElement): number[] {
  const found = new Set<number>();
  container.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const h = el.style?.height;
    if (h && h.endsWith("px")) {
      const n = Number.parseFloat(h);
      if (!Number.isNaN(n)) found.add(n);
    }
  });
  return [...found];
}

describe("PromoSection one-row rendering (#499)", () => {
  it("given a one-row section > then it emits the single-row height and never the two-row height", () => {
    const { container } = mount("travel", 4);
    const heights = emittedHeights(container);

    expect(heights).toContain(layout.topBrandCardHeight);
    // The empty gap in the ticket IS the second row plus the row gap.
    expect(heights).not.toContain(layout.topBrandGridHeight);
  });

  it("given a two-row section > then it still emits the shared two-row height", () => {
    const { container } = mount("trending", 12);

    expect(emittedHeights(container)).toContain(layout.topBrandGridHeight);
  });

  it("given travel and trending side by side > then travel is strictly shorter", () => {
    const travel = Math.max(...emittedHeights(mount("travel", 4).container));
    const trending = Math.max(...emittedHeights(mount("trending", 12).container));

    expect(travel).toBeLessThan(trending);
  });

  it("given makeup > then it is one-row like travel, not two-row like trending", () => {
    const heights = emittedHeights(mount("makeup", 4).container);

    expect(heights).toContain(layout.topBrandCardHeight);
    expect(heights).not.toContain(layout.topBrandGridHeight);
  });
});
