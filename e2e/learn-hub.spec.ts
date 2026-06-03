import { test, expect } from "@playwright/test";

/**
 * Issue #17 — the Learn hub should carry at least 10 published articles, each
 * reachable and rendered (drives SEO surface + Article schema).
 */
test.describe("learn hub (#17)", () => {
  test("hub links to at least 10 articles", async ({ page }) => {
    await page.goto("/learn", { waitUntil: "load", timeout: 90_000 });
    const articleLinks = page.locator('a[href^="/learn/"]');
    expect(await articleLinks.count()).toBeGreaterThanOrEqual(10);
  });

  test("a newly added article renders", async ({ page }) => {
    await page.goto("/learn/how-quests-work", {
      waitUntil: "load",
      timeout: 90_000,
    });
    await expect(
      page.getByRole("heading", { name: /How GoGoCash Quests work/ }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
});
