import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const favoriteBrandsFile = "src/screens/CustomerFavoriteBrandsScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer favorite brands dark mode surfaces", () => {
  it("favorite brands shell > given dark theme > then matches other account sub-pages", () => {
    const source = readMobileFile(favoriteBrandsFile);

    expect(source).toMatch(/surface:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/surface:[\s\S]*borderColor: colors\.border/);
    expect(source).toMatch(/topBar:[\s\S]*borderBottomColor: colors\.border/);
    expect(source).not.toContain('borderBottomColor: "rgba(16, 53, 34, 0.12)"');
  });

  it("section headers > given dark theme > then use readable ink tokens", () => {
    const source = readMobileFile(favoriteBrandsFile);

    expect(source).toMatch(/pageTitle:[\s\S]*color: colors\.ink/);
    expect(source).toMatch(/sectionTitle:[\s\S]*color: colors\.ink/);
    expect(source).not.toMatch(/pageTitle:[\s\S]*color: "#3A4B61"/);
    expect(source).not.toMatch(/sectionTitle:[\s\S]*color: "#3A4B61"/);
    expect(source).toMatch(/favoritesEmptyTitle:[\s\S]*color: colors\.ink/);
    expect(source).not.toMatch(/favoritesEmptyTitle:[\s\S]*color: "#3A4B61"/);
  });

  it("hero and nested controls > given dark theme > then use themed surfaces and muted body copy", () => {
    const source = readMobileFile(favoriteBrandsFile);

    expect(source).toMatch(/heroCard:[\s\S]*backgroundColor: pickThemed\(/);
    expect(source).toMatch(/heroCard:[\s\S]*borderColor: pickThemed\(/);
    expect(source).toMatch(/heroDescription:[\s\S]*color: colors\.muted/);
    expect(source).not.toMatch(/heroDescription:[\s\S]*color: "#3A4B61"/);
    expect(source).toMatch(/searchPill:[\s\S]*backgroundColor: colors\.field/);
    expect(source).toMatch(/favoritesEmpty:[\s\S]*backgroundColor: colors\.fieldMuted/);
  });
});
