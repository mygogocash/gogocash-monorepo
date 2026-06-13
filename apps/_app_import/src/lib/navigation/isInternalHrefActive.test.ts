import { desktopMenuBarNav } from "@/constants/navigation";
import { describe, expect, it } from "vitest";
import { isInternalHrefActive, isMenuBarItemActive } from "./isInternalHrefActive";

describe("isInternalHrefActive", () => {
  it("matches exact paths", () => {
    expect(isInternalHrefActive("/shop", "/shop")).toBe(true);
    expect(isInternalHrefActive("/category/Electronics", "/category/Electronics")).toBe(true);
  });

  it("matches encoded category segments", () => {
    expect(isInternalHrefActive("/category/Digital%20Services", "/category/Digital Services")).toBe(
      true
    );
    expect(
      isInternalHrefActive("/category/Health%20%26%20Beauty", "/category/Health & Beauty")
    ).toBe(true);
  });

  it("matches subpaths under href", () => {
    expect(isInternalHrefActive("/shop/foo", "/shop")).toBe(true);
  });

  it("rejects unrelated paths", () => {
    expect(isInternalHrefActive("/profile", "/shop")).toBe(false);
    expect(isInternalHrefActive("/category/Electronics", "/category/Travel")).toBe(false);
  });

  it("rejects empty or external href", () => {
    expect(isInternalHrefActive("/x", "")).toBe(false);
    expect(isInternalHrefActive("/x", "https://example.com")).toBe(false);
  });
});

describe("isMenuBarItemActive", () => {
  // Originally pointed at `digital-services`; that item was removed from
  // desktopMenuBarNav in commit fb03097 ("drop Digital Services from
  // desktop menu bar"). Switched to `health-beauty` which has the same
  // encoding shape (space + `&` in the href) so the test still covers
  // the encoded-segment matching logic the original asserted.
  it("marks an encoded-href nav item as active for its encoded URL", () => {
    const item = desktopMenuBarNav.find((i) => i.id === "health-beauty");
    expect(item).toBeDefined();
    expect(isMenuBarItemActive("/category/Health%20%26%20Beauty", item!)).toBe(true);
  });

  it("is false for product discover tab (popover, not a route)", () => {
    const item = desktopMenuBarNav.find((i) => i.id === "product-discover");
    expect(item).toBeDefined();
    expect(isMenuBarItemActive("/shop/abc123", item!)).toBe(false);
  });
});
