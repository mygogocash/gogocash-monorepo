import { expect, test } from "@playwright/test";

test.describe("admin RBAC", () => {
  test("viewer admin-users route resolves", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel(/email/i).fill("viewer@gogocash.co");
    await page.locator('#admin-signin-password').fill("1234");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(dashboard|brands|403)/, { timeout: 45_000 });

    await page.goto("/admin-users");
    await expect(page.getByText(/admin user|team|users/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("editor can open brands but not roles", async ({ page }) => {
    await page.goto("/signin");
    await page.getByLabel(/email/i).fill("editor@gogocash.co");
    await page.locator('#admin-signin-password').fill("1234");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/(dashboard|brands)/, { timeout: 45_000 });

    await page.goto("/brands");
    await expect(page.getByText(/brands/i).first()).toBeVisible();

    await page.goto("/roles");
    await expect(page).toHaveURL(/403|signin|brands|dashboard/, { timeout: 20_000 });
  });
});
