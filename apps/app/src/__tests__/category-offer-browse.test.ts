import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOfferSearchPath,
  CATEGORY_OFFER_BROWSE_LIMIT,
} from "@mobile/account/searchResource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("category offer browse (#438)", () => {
  it("buildOfferSearchPath > given Electronics category > then requests category-scoped offer page", () => {
    expect(
      buildOfferSearchPath({
        category: "Electronics",
        limit: CATEGORY_OFFER_BROWSE_LIMIT,
        page: 1,
        regionCode: "TH",
      }),
    ).toBe("/offer?limit=80&page=1&category=Electronics&country=TH");
  });

  it("useCategoryOfferBrowse > source pins category browse path and limit", () => {
    const hookFile = fs.readFileSync(
      path.join(mobileRoot, "src/account/useCategoryOfferBrowse.ts"),
      "utf8",
    );
    expect(hookFile).toContain("CATEGORY_OFFER_BROWSE_LIMIT");
    expect(hookFile).toContain("buildOfferSearchPath");
    expect(hookFile).toContain("category: trimmedCategory");
    expect(hookFile).toContain('queryKey: ["category-offer-browse"');
  });

  it("CustomerCategoryDetailScreen > uses category browse instead of home brandCatalog", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerCategoryDetailScreen.tsx"),
      "utf8",
    );
    expect(screenFile).toContain("useCategoryOfferBrowse");
    expect(screenFile).not.toContain('resourceId: "brandCatalog"');
  });
});
