import { describe, expect, it } from "vitest";

import { shouldHideDesktopHeaderSearch } from "@mobile/components/CustomerDesktopRouteChrome";

// Founder request (2026-07-22): the global desktop header search must be available on
// EVERY desktop stage — including the directory pages (/brand, /category, /shops,
// /discover) that also own a page-scoped search. This intentionally overrides the
// earlier #436/#463/#495 decision that hid the header search on those routes. The
// function must now return false for every route so the header search is never hidden.
describe("shouldHideDesktopHeaderSearch — header search always shown on desktop", () => {
  const routes = [
    // former directory routes that USED to hide it (#436/#463/#495)
    "/brand",
    "/brand/nike",
    "/category",
    "/category/electronics",
    "/shops",
    "/discover",
    // trailing-slash variants (normalizeDesktopPathname must not resurrect hiding)
    "/shops/",
    "/discover/",
    "/brand/",
    "/category/",
    // routes that always showed it
    "/",
    "/wallet",
    "/quest",
    "/profile/info",
    "/shop/68e360b9d1a55e0e7f455bad",
  ];

  it.each(routes)(
    "given %s > then the desktop header search is shown (never hidden)",
    (route) => {
      expect(shouldHideDesktopHeaderSearch(route)).toBe(false);
    },
  );
});
