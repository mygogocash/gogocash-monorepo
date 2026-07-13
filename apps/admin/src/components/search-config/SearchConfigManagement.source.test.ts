import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "SearchConfigManagement.tsx"),
  "utf8",
);

describe("SearchConfigManagement — #279 non-blocking error banner (source signals)", () => {
  it("no longer replaces the whole page with AdminQueryError when a query errors", () => {
    expect(source).not.toMatch(/isError[^]{0,300}?return \(\s*<AdminQueryError/);
  });

  it("keeps the loading skeleton early return", () => {
    expect(source).toMatch(
      /isLoading[^]{0,120}?return <AdminTableSkeleton \/>/,
    );
  });

  it("renders a banner with the real upstream message via getApiErrorMessage", () => {
    expect(source).toContain("getApiErrorMessage(");
    expect(source).toContain(
      'getApiErrorMessage(firstError, "Could not load search configuration.")',
    );
    expect(source).toContain('from "@/lib/getApiErrorMessage"');
  });

  it("banner renders inside the main return, above the rule builder sections", () => {
    // Root JSX of the component's main return — banner and sections must
    // both live inside it (no early return swallowing the sections).
    const mainReturn = source.slice(
      source.indexOf('<div className="space-y-6">'),
    );
    const bannerAt = mainReturn.indexOf("Could not load search configuration.");
    const builderAt = mainReturn.indexOf("Add a search rule");
    expect(bannerAt).toBeGreaterThan(-1);
    expect(builderAt).toBeGreaterThan(bannerAt);
  });

  it("Try again refetches all three queries", () => {
    const mainReturn = source.slice(
      source.indexOf('<div className="space-y-6">'),
    );
    expect(mainReturn).toContain("Try again");
    expect(mainReturn).toContain("ftQ.refetch()");
    expect(mainReturn).toContain("brQ.refetch()");
    expect(mainReturn).toContain("blQ.refetch()");
  });
});
