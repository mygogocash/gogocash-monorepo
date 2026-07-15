import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("../screens/discovery/CustomerBrandDirectoryScreen.tsx", import.meta.url),
  "utf8",
);

describe("CustomerBrandDirectoryScreen all-brand banner wiring", () => {
  it("loads and resolves the dedicated admin-configured resource", () => {
    expect(source).toContain('resourceId: "allBrandBanner"');
    expect(source).toContain("resolveAllBrandPromo(");
    expect(source).not.toContain("promo={webBrandDirectory.promo}");
  });
});
