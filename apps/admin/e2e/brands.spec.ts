import { expect, test } from "@playwright/test";
import { expectRouteLoads } from "./helpers";

test.describe("admin brands", () => {
  test("brands list loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands", /brands|management/i);
  });

  test("create brand page loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands/create-brand", /create|brand|affiliate/i);
  });

  test("top brands tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=top-brands", /top brands|save top brands/i);
  });

  test("top brands can navigate back to the Brands list from both navigation controls", async ({
    page,
  }) => {
    await page.goto("/brands?tab=top-brands");

    const managementTabs = page.getByRole("tablist", {
      name: "Brands management sections",
    });
    await managementTabs
      .getByRole("tab", { name: "Brands", exact: true })
      .click();
    await expect(page).toHaveURL(/\/brands$/);
    await expect(
      managementTabs.getByRole("tab", { name: "Brands", exact: true }),
    ).toHaveAttribute("aria-selected", "true");

    await page.goto("/brands?tab=top-brands");
    await page
      .locator("aside")
      .getByRole("link", { name: "Brands", exact: true })
      .click();
    await expect(page).toHaveURL(/\/brands$/);
    await expect(
      managementTabs.getByRole("tab", { name: "Brands", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("commission tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=commission", /commission|partner rates/i);
  });

  test("policy tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=policy", /policy|terms/i);
  });

  test("deeplink tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=deeplink", /tracking|deeplink|link/i);
  });
});
