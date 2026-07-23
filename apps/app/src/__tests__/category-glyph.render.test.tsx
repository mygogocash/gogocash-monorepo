import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryGlyph } from "@mobile/components/CategoryGlyph";

// Founder request 2026-07-22: category chrome shows the built-in ICON glyph for every
// category, not the admin-uploaded image. The drive-migrated originals were inconsistent
// (wrong/mismatched art, multi-MB raw files behind a ~20px chip). CategoryGlyph now ignores
// imageUrl entirely and always renders the icon_key / label glyph, so no <img> ever ships
// and the whole category set reads as one clean, aligned icon system.
describe("CategoryGlyph — always renders the built-in icon (uploaded images disabled)", () => {
  it("given an R2 category image url > then it is ignored and the icon renders (no <img>)", () => {
    const { container } = render(
      createElement(CategoryGlyph, {
        category: "Travel",
        imageUrl: "https://media.gogocash.co/brands/drive-migrated/abc123",
        color: "#000",
        size: 20,
      }),
    );

    expect(container.querySelector("img")).toBeNull();
    // Neither the raw nor a transformed image URL ships.
    expect(container.innerHTML).not.toContain("media.gogocash.co");
  });

  it("given any other image host > then it is still ignored (no <img>, no transform)", () => {
    const { container } = render(
      createElement(CategoryGlyph, {
        category: "Fashion",
        imageUrl: "https://img.involve.asia/x/logo.png",
        color: "#000",
        size: 20,
      }),
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("img.involve.asia");
    expect(container.innerHTML).not.toContain("cdn-cgi/image");
  });

  it("given no image url > then it renders the built-in glyph (no <img>)", () => {
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
