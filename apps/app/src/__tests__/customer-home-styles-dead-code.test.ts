import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("customerHomeStyles dead desktop header removal", () => {
  it("given customerHomeStyles > then legacy desktop header styles were removed", () => {
    const source = fs.readFileSync(
      path.join(mobileRoot, "src/screens/home/customerHomeStyles.ts"),
      "utf8",
    );

    expect(source).not.toContain("desktopHeader:");
    expect(source).not.toContain("desktopCategoryNavItem:");
    expect(source).not.toContain("desktopLocalePopover:");
    expect(source).toContain("desktopGoLinkBanner:");
  });
});
