import { expect, test } from "@playwright/test";
import { loginAdminViaApi, openAdminPage } from "../helpers/admin-auth";
import { getWithdrawCheck } from "../helpers/api-client";
import {
  buildCustomerSession,
  seedCustomerSession,
} from "../helpers/customer-auth";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-07 withdraw request → admin approve", () => {
  test("customer withdraw pending → admin queue → balance gate", async ({
    page,
    browser,
    request,
  }) => {
    const seed = loadE2eSeed();
    const before = await getWithdrawCheck(request, seed.customerToken, seed.apiUrl);
    const available = Number(before.netAmountTHB ?? 0);
    test.skip(available < 10, "Insufficient seeded balance for withdraw E2E");

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/withdraw`);
    await expect(page.getByText(/withdraw/i).first()).toBeVisible({ timeout: 20_000 });

    const withdrawRes = await request.post(`${seed.apiUrl}/withdraw/bank-transfer`, {
      headers: { Authorization: `Bearer ${seed.customerToken}` },
      data: { amount_net: 10, amount_total: 10, currency: "THB" },
    });
    if (!withdrawRes.ok()) {
      throw new Error(
        `POST /withdraw/bank-transfer failed (${withdrawRes.status()}): ${await withdrawRes.text()}`,
      );
    }

    const admin = await loginAdminViaApi(request, "admin@gogocash.co", "1234", seed.apiUrl);
    const queue = await request.get(`${seed.apiUrl}/admin/withdraw-all`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    if (!queue.ok()) {
      throw new Error(
        `GET /admin/withdraw-all failed (${queue.status()}): ${await queue.text()}`,
      );
    }

    const adminPage = await openAdminPage(browser, seed.adminUrl);
    await adminPage.goto(`${seed.adminUrl}/withdraw`);
    await expect(adminPage.getByText(/pending|withdraw/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await adminPage.close();

    const after = await getWithdrawCheck(request, seed.customerToken, seed.apiUrl);
    expect(Number(after.netAmountTHB ?? 0)).toBeLessThan(available);
  });
});
