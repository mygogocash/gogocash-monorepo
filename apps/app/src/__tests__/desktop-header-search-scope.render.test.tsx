import { describe, expect, it } from "vitest";

import { shouldHideDesktopHeaderSearch } from "@mobile/components/CustomerDesktopRouteChrome";

/**
 * Founder call (2026-07-23), reversing the 2026-07-22 "show it everywhere" request:
 * the global header search navigates back to the home stage when used, so on pages
 * that own a page-scoped search it both duplicates that search AND throws the user
 * off the page they were browsing. Keep it on the home stage; hide it wherever the
 * page already has its own search field.
 */
const OWNS_PAGE_SCOPED_SEARCH = [
  "/brand",
  "/brand/nike",
  "/shops",
  "/discover",
  "/category",
  "/category/electronics",
  "/category/Fashion",
  "/category/Health%20%26%20Beauty",
  // trailing-slash variants must normalize, not slip through
  "/brand/",
  "/shops/",
  "/discover/",
  "/category/",
];

const KEEPS_HEADER_SEARCH = [
  "/",
  "/wallet",
  "/quest",
  "/profile",
  "/profile/info",
  "/shop/68e360b9d1a55e0e7f455bad",
];

describe("desktop header search scope", () => {
  for (const pathname of OWNS_PAGE_SCOPED_SEARCH) {
    it(`${pathname} > given the page owns a search field > hides the header search`, () => {
      expect(shouldHideDesktopHeaderSearch(pathname)).toBe(true);
    });
  }

  for (const pathname of KEEPS_HEADER_SEARCH) {
    it(`${pathname} > given no page-scoped search > keeps the header search`, () => {
      expect(shouldHideDesktopHeaderSearch(pathname)).toBe(false);
    });
  }
});
