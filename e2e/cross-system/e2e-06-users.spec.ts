import { expect, test } from "@playwright/test";
import { openAdminPage } from "../helpers/admin-auth";
import {
  buildCustomerSession,
  seedCustomerSession,
} from "../helpers/customer-auth";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-06 admin users ↔ customer profile", () => {
  test("seeded customer visible in admin users and profile loads", async ({
    page,
    browser,
  }) => {
    const seed = loadE2eSeed();

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/profile`);
    await expect(page.getByText(/Profile|Total Cashback/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const adminPage = await openAdminPage(browser, seed.adminUrl);
    await adminPage.goto(`${seed.adminUrl}/users`);
    await expect(adminPage.getByText(/e2e.customer@gogocash.co/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await adminPage.close();
  });
});
