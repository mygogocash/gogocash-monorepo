import { describe, expect, it } from "vitest";

import { safeImageSrc } from "./CategoryIconPicker";

// #540 — CodeQL js/xss-through-dom: a persisted category.image URL flows into an
// <img src>. Only script-safe schemes may survive.
describe("safeImageSrc", () => {
  it("keeps http(s), object-URL, and same-origin relative sources", () => {
    for (const url of [
      "https://media.gogocash.co/icons/food.png",
      "http://localhost:3000/x.png",
      "blob:https://admin.gogocash.co/6b2c-abc",
      "/uploads/icon.png",
    ]) {
      expect(safeImageSrc(url)).toBe(url);
    }
  });

  it("drops script-capable / unsafe schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "  javascript:alert(document.cookie)  ",
    ]) {
      expect(safeImageSrc(url)).toBeNull();
    }
  });

  it("returns null for empty / nullish input", () => {
    expect(safeImageSrc(null)).toBeNull();
    expect(safeImageSrc(undefined)).toBeNull();
    expect(safeImageSrc("")).toBeNull();
  });
});
