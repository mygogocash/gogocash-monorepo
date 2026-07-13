import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const bannerPageSource = readFileSync(
  resolve(process.cwd(), "src/app/(admin)/(others-pages)/banner/page.tsx"),
  "utf8",
);

describe("Banner page surfaces", () => {
  it("renders only backend-supported banner surfaces on the home banner page", () => {
    expect(bannerPageSource).toContain("<BannerTable />");
    expect(bannerPageSource).not.toContain('variant="homeSmall"');
  });
});

const bannerTableSource = readFileSync(
  resolve(process.cwd(), "src/components/banner/BannerTable.tsx"),
  "utf8",
);

describe("Banner sub-page navigation (issue #280 dedupe)", () => {
  it("BannerTable carries no headerNavMode variant config", () => {
    expect(bannerTableSource).not.toContain("headerNavMode");
  });

  it("BannerTable header renders no sub-page navigation links (BannerSubNav owns navigation)", () => {
    expect(bannerTableSource).not.toContain('href="/banner/all-brand-page"');
    expect(bannerTableSource).not.toContain('href="/banner/modal-popups"');
    // No button-styled nav Links may remain; the inline "see Popup history"
    // footnote under the table is contextual copy, not a navigation row.
    expect(bannerTableSource).not.toMatch(
      /<Link\s+href="\/banner[^"]*"\s+className="inline-flex/,
    );
  });

  const bannerPageFiles: Record<string, string> = {
    "home banner": "src/app/(admin)/(others-pages)/banner/page.tsx",
    "all brand page banner": "src/app/(admin)/(others-pages)/banner/all-brand-page/page.tsx",
    "modal popups": "src/app/(admin)/(others-pages)/banner/modal-popups/page.tsx",
    "popup history": "src/app/(admin)/(others-pages)/banner/popup-history/page.tsx",
  };

  for (const [name, relPath] of Object.entries(bannerPageFiles)) {
    it(`${name} page renders the top BannerSubNav tabs`, () => {
      const source = readFileSync(resolve(process.cwd(), relPath), "utf8");
      expect(source).toContain('import BannerSubNav from "@/components/banner/BannerSubNav"');
      expect(source).toContain("<BannerSubNav />");
    });
  }
});
