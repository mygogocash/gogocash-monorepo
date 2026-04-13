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
  it("marks digital services from encoded path using nav href", () => {
    const item = desktopMenuBarNav.find((i) => i.id === "digital-services");
    expect(item).toBeDefined();
    expect(isMenuBarItemActive("/category/Digital%20Services", item!)).toBe(true);
  });

  it("is false for product discover tab (popover, not a route)", () => {
    const item = desktopMenuBarNav.find((i) => i.id === "product-discover");
    expect(item).toBeDefined();
    expect(isMenuBarItemActive("/shop/abc123", item!)).toBe(false);
  });
});
