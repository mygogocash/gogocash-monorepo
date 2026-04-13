import { describe, expect, it } from "vitest";
import { isMainFlexNonePath } from "./mainFlexConfig";

describe("isMainFlexNonePath", () => {
  it("matches link-mycashback and shop routes", () => {
    expect(isMainFlexNonePath("/link-mycashback")).toBe(true);
    expect(isMainFlexNonePath("/shop")).toBe(true);
    expect(isMainFlexNonePath("/discover")).toBe(true);
    expect(isMainFlexNonePath("/shop/abc123")).toBe(true);
    expect(isMainFlexNonePath("/")).toBe(false);
    expect(isMainFlexNonePath("/profile")).toBe(false);
  });
});
