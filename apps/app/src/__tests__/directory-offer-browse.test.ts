import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildOfferSearchPath,
  CATEGORY_OFFER_BROWSE_LIMIT,
} from "../account/searchResource";

const mobileRoot = path.resolve(__dirname, "..");

describe("directory offer browse (#462)", () => {
  it("buildOfferSearchPath > given no search > then requests the 80-offer browse page", () => {
    expect(
      buildOfferSearchPath({
        limit: CATEGORY_OFFER_BROWSE_LIMIT,
        page: 1,
      }),
    ).toContain(`limit=${CATEGORY_OFFER_BROWSE_LIMIT}`);
  });

  it("useDirectoryOfferBrowse > source pins browse limit and brand directory uses it", () => {
    const hookFile = readFileSync(
      path.join(mobileRoot, "account/useDirectoryOfferBrowse.ts"),
      "utf8",
    );
    const screenFile = readFileSync(
      path.join(mobileRoot, "screens/discovery/CustomerBrandDirectoryScreen.tsx"),
      "utf8",
    );

    expect(hookFile).toContain("CATEGORY_OFFER_BROWSE_LIMIT");
    expect(hookFile).toContain("buildOfferSearchPath");
    expect(screenFile).toContain("useDirectoryOfferBrowse");
    expect(screenFile).toContain('useState<WebBrandDirectorySort>("all")');
  });
});
