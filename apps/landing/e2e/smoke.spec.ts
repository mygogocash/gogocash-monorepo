import { test, expect } from "@playwright/test";
import { PRODUCTION_PAGE_PATHS } from "./production-routes";

for (const path of PRODUCTION_PAGE_PATHS) {
  test(`GET ${path} returns 200 and renders main`, async ({ page }) => {
    const response = await page.goto(path, {
      waitUntil: "load",
      timeout: 90_000,
    });
    expect(
      response,
      `expected navigation response for ${path}`,
    ).not.toBeNull();
    expect(response!.status(), `HTTP status for ${path}`).toBe(200);
    await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });
  });
}
