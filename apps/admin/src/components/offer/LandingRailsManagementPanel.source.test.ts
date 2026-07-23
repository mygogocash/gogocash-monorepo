import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const panelSource = readFileSync(
  new URL("./LandingRailsManagementPanel.tsx", import.meta.url),
  "utf8",
);
const tabsSource = readFileSync(
  new URL("./OffersManagementTabs.tsx", import.meta.url),
  "utf8",
);
const pageContentSource = readFileSync(
  new URL("./OffersManagementPageContent.tsx", import.meta.url),
  "utf8",
);
const apiSource = readFileSync(
  new URL("../../lib/api.ts", import.meta.url),
  "utf8",
);

describe("LandingRailsManagementPanel wiring", () => {
  it("reads and writes the landing-rails admin endpoints via apiClient", () => {
    expect(panelSource).toContain("apiClient.getLandingRails()");
    expect(panelSource).toContain("apiClient.saveLandingRails(");
  });

  it("reuses the Top brands drag preview for per-device ordering", () => {
    expect(panelSource).toContain("TopBrandLandingPreview");
    expect(panelSource).toContain("orderDesktop");
    expect(panelSource).toContain("orderMobile");
  });

  it("exposes per-rail presentation controls (title/emoji/link/enabled/position)", () => {
    expect(panelSource).toContain("Title");
    expect(panelSource).toContain("Emoji");
    expect(panelSource).toContain("Enabled");
    expect(panelSource).toContain("position");
  });

  it("registers the Landing rails tab in Brands Management", () => {
    expect(tabsSource).toContain('id: "landing-rails"');
    expect(tabsSource).toContain('return "landing-rails"');
    expect(pageContentSource).toContain(
      'activeTab === "landing-rails" && <LandingRailsManagementPanel />',
    );
  });

  it("exposes the landing-rails api client methods", () => {
    expect(apiSource).toContain('async getLandingRails()');
    expect(apiSource).toContain('async saveLandingRails(');
    expect(apiSource).toContain('"/admin/landing-rails"');
  });
});
