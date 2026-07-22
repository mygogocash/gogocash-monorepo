import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryGlyph } from "@mobile/components/CategoryGlyph";

// Phase 1 — every customer-facing R2 image must be served through Cloudflare
// Image Resizing, not raw. CategoryGlyph is the single render point for
// category.image across CategoryDetail + the three discovery sidebars, and it
// was passing the raw media.gogocash.co URL straight to <Image>. The drive-
// migrated category originals run up to several MB, so a full-size PNG was
// shipping to every visitor for a ~20px chip. It must resolve to a /cdn-cgi/image
// AVIF sized to the glyph.
describe("CategoryGlyph media optimization (Phase 1)", () => {
  it("given an R2 image url > then renders it through the Cloudflare image transform", () => {
    const { container } = render(
      createElement(CategoryGlyph, {
        category: "Travel",
        imageUrl: "https://media.gogocash.co/brands/drive-migrated/abc123",
        color: "#000",
        size: 20,
      }),
    );

    const html = container.innerHTML;
    expect(html).toContain("media.gogocash.co/cdn-cgi/image/");
    expect(html).toContain("/brands/drive-migrated/abc123");
    // The full-size raw URL must NOT be what ships.
    expect(html).not.toContain(
      'media.gogocash.co/brands/drive-migrated/abc123"',
    );
  });

  it("given a non-allowlisted host > then passes it through unchanged", () => {
    const { container } = render(
      createElement(CategoryGlyph, {
        category: "Travel",
        imageUrl: "https://img.involve.asia/x/logo.png",
        color: "#000",
        size: 20,
      }),
    );

    expect(container.innerHTML).toContain("img.involve.asia/x/logo.png");
    expect(container.innerHTML).not.toContain("cdn-cgi/image");
  });

  it("given no image url > then falls back to the built-in glyph (no <img>)", () => {
    const { container } = render(
      createElement(CategoryGlyph, {
        category: "Travel",
        color: "#000",
        size: 20,
      }),
    );

    expect(container.querySelector("img")).toBeNull();
  });
});
