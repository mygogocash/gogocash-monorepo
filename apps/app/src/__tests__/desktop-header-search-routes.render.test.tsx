import { describe, expect, it } from "vitest";

import { shouldHideDesktopHeaderSearch } from "@mobile/components/CustomerDesktopRouteChrome";

// #495 — directory pages that own a page-scoped search must not ALSO show the global
// desktop header search. /category (#436) and /brand (#463) were fixed; /shops and
// /discover were missed, and /discover was never reported at all.
//
// The existing coverage in desktop-shell-parity.test.ts only greps the source for route
// literals and never calls the function — which is exactly why a missing route slipped
// through twice. These tests invoke it.
describe("shouldHideDesktopHeaderSearch (#495)", () => {
  const hidden = [
    "/brand",
    "/brand/nike",
    "/category",
    "/category/electronics",
    "/shops",
    "/discover",
  ];

  it.each(hidden)("given %s (page owns its search) > then the header search is hidden", (route) => {
    expect(shouldHideDesktopHeaderSearch(route)).toBe(true);
  });

  it.each(["/shops/", "/discover/"])(
    "given %s (trailing slash) > then it still hides",
    (route) => {
      // Pins normalizeDesktopPathname — a route table that only matched the exact string
      // would regress the moment a link gained a trailing slash.
      expect(shouldHideDesktopHeaderSearch(route)).toBe(true);
    },
  );

  const shown = ["/", "/wallet", "/quest", "/profile/info", "/shop/68e360b9d1a55e0e7f455bad"];

  it.each(shown)("given %s (no page-scoped search) > then the header search is shown", (route) => {
    // /shop/:id is the singular detail route and has no search of its own — it must stay
    // visible, so this guards against matching /shop as a prefix of /shops.
    expect(shouldHideDesktopHeaderSearch(route)).toBe(false);
  });
});
