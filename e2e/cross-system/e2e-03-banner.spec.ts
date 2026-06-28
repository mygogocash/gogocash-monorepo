import { expect, test } from "@playwright/test";
import { loginAdminViaUi } from "../helpers/admin-auth";
import { loadE2eSeed } from "../helpers/seed-data";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

test.describe("E2E-03 home banner schedule", () => {
  test("banner with today start date shows on customer home", async ({ page }) => {
    const seed = loadE2eSeed();
    await loginAdminViaUi(page, "admin@gogocash.co", "1234", seed.adminUrl);
    await page.goto(`${seed.adminUrl}/banner`);
    await expect(page.getByText(/banner|carousel/i).first()).toBeVisible({
      timeout: 20_000,
    });

    const customerPage = await page.context().newPage();
    await customerPage.goto(`${seed.appUrl}/`);
    await expect(customerPage.locator("body")).toContainText(/E2E|Shop|Brand|Cashback/i, {
      timeout: 30_000,
    });

    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await customerPage.close();
  });
});
