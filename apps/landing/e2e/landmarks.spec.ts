import { test, expect } from "@playwright/test";

test.describe("document landmarks", () => {
  test("home exposes banner, main, and contentinfo", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await expect(page.getByRole("banner")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("learn hub exposes main", async ({ page }) => {
    await page.goto("/learn", { waitUntil: "load", timeout: 90_000 });
    await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });
  });
});
