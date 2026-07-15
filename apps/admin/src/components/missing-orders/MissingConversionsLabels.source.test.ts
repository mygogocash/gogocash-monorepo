import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath: string) =>
  readFileSync(resolve(testDirectory, relativePath), "utf8");

const offersTabsSource = readSource("../offer/OffersManagementTabs.tsx");
const sidebarSource = readSource("../../layout/AppSidebarContent.tsx");
const pageSource = readSource(
  "../../app/(admin)/(others-pages)/missing-orders/page.tsx",
);
const managementSource = readSource("./MissingOrdersManagement.tsx");

describe("issue #311 missing conversions display labels", () => {
  it("uses the business term in every confirmed user-facing location", () => {
    expect(offersTabsSource).toContain("Missing conversions");
    expect(sidebarSource).toContain(
      '{ name: "Missing conversions", path: "/missing-orders"',
    );
    expect(pageSource).toContain(
      'title: "Missing Conversions | GoGoCash Admin"',
    );
    expect(pageSource).toContain('pageTitle="Missing Conversions"');
    expect(pageSource).toContain('{ label: "Missing Conversions" }');
    expect(managementSource).toContain(
      'title="Could not load missing conversions"',
    );
  });

  it("preserves the existing internal route and component identifiers", () => {
    expect(offersTabsSource).toContain('href="/missing-orders"');
    expect(sidebarSource).toContain('path: "/missing-orders"');
    expect(pageSource).toContain("MissingOrdersManagement");
    expect(managementSource).toContain("MissingOrdersManagement");
  });
});
