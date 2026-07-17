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
const e2eSource = readSource(
  "../../../../../e2e/cross-system/e2e-08-missing-conversions.spec.ts",
);

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

describe("issue #351 cross-system acceptance cleanup contract", () => {
  it("approves the claim, proves wallet invariance, and cleans the exact row in finally", () => {
    expect(e2eSource).toContain("try {");
    expect(e2eSource).toContain("finally {");
    expect(e2eSource).toContain("/approve");
    expect(e2eSource).not.toContain("/reject");
    expect(e2eSource).toContain("walletBefore");
    expect(e2eSource).toContain("walletAfter");
    expect(e2eSource).toContain("deleteMany");
    expect(e2eSource).toContain("countDocuments");
  });
});
