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
    expect(bannerSurfaceSource).not.toContain(
      '["home", "homeSmall", "allBrand"]',
    );
  });
});

const bannerTableSource = readFileSync(
  resolve(process.cwd(), "src/components/banner/BannerTable.tsx"),
  "utf8",
);
const formUpdateSource = readFileSync(
  resolve(process.cwd(), "src/components/banner/FormUpdate.tsx"),
  "utf8",
);
const bannerSubNavSource = readFileSync(
  resolve(process.cwd(), "src/components/banner/BannerSubNav.tsx"),
  "utf8",
);
const bannerSurfaceSource = readFileSync(
  resolve(process.cwd(), "src/lib/bannerAdminSurfaces.ts"),
  "utf8",
);
const sidebarSource = readFileSync(
  resolve(process.cwd(), "src/layout/AppSidebarContent.tsx"),
  "utf8",
);
const specificPageSource = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(admin)/(others-pages)/banner/all-brand-page/page.tsx",
  ),
  "utf8",
);
const supportSource = readFileSync(
  resolve(process.cwd(), "src/app/(admin)/(others-pages)/support/page.tsx"),
  "utf8",
);
const inactiveSlotsSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/banner/BannerInactiveSlotsSection.tsx",
  ),
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
    "specific page banner":
      "src/app/(admin)/(others-pages)/banner/all-brand-page/page.tsx",
    "modal popups":
      "src/app/(admin)/(others-pages)/banner/modal-popups/page.tsx",
    "popup history":
      "src/app/(admin)/(others-pages)/banner/popup-history/page.tsx",
  };

  for (const [name, relPath] of Object.entries(bannerPageFiles)) {
    it(`${name} page renders the top BannerSubNav tabs`, () => {
      const source = readFileSync(resolve(process.cwd(), relPath), "utf8");
      expect(source).toContain(
        'import BannerSubNav from "@/components/banner/BannerSubNav"',
      );
      expect(source).toContain("<BannerSubNav />");
    });
  }
});

describe("Banner placement clarity (issue #338)", () => {
  it("renames the visible admin surface everywhere without changing its compatible route", () => {
    for (const source of [
      bannerSubNavSource,
      bannerTableSource,
      bannerSurfaceSource,
      sidebarSource,
      specificPageSource,
      supportSource,
    ]) {
      expect(source).not.toContain("All Brand Page banner");
      expect(source).toContain("Specific Page Banner");
    }
    expect(bannerSubNavSource).toContain('href: "/banner/all-brand-page"');
  });

  it("documents the only wired specific-page target and does not promise fake targets", () => {
    expect(bannerTableSource).toContain("All Brands page banner set");
    expect(bannerTableSource).toContain("Page target: All Brands page");
    expect(bannerTableSource).toContain(
      "Additional page targets require a wired customer placement",
    );
  });

  it("keeps the homepage contract at three carousel plus two lower slots", () => {
    expect(bannerTableSource).toContain(
      "Slots 1–3 are the top sliding carousel. Slots 4–5 are the two smaller banners below it.",
    );
    expect(bannerTableSource).not.toContain("Same five slots");
    expect(supportSource).toContain("top carousel slides 1–3");
    expect(supportSource).toContain("smaller lower banners in slots 4–5");
  });

  it("uses the same slot contract in Popup history", () => {
    expect(inactiveSlotsSource).toContain(
      "getBannerSlotDescriptors(surfaceId)",
    );
    expect(inactiveSlotsSource).toContain("managedSlots.has(slot)");
  });
});

describe("Banner API documentation (issue #313)", () => {
  it("describes both persisted banner endpoints as live API targets", () => {
    expect(formUpdateSource).toContain("Live API POST target");
    expect(formUpdateSource).not.toContain("POST target (mock:");
  });
});
