import { expect, test } from "@playwright/test";
import { loginAdminViaApi } from "../helpers/admin-auth";
import { pollTopBrandsIncludes } from "../helpers/api-client";
import {
  buildCustomerSession,
  seedCustomerSession,
} from "../helpers/customer-auth";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-02 brand enable → customer top brands", () => {
  test("seeded brand appears in API top-brands and customer home", async ({
    page,
    request,
  }) => {
    const seed = loadE2eSeed();
    const admin = await loginAdminViaApi(request, "admin@gogocash.co", "1234", seed.apiUrl);

    await request.put(`${seed.apiUrl}/admin/top-brands`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: {
        brands: [{ offerId: seed.brandId, cashback: "5% cashback" }],
      },
    });

    const brand = await pollTopBrandsIncludes(
      request,
      (b) => String(b._id ?? b.id) === seed.brandId || b.offer_name === "E2E Test Brand",
      seed.apiUrl,
    );
    expect(brand).toBeTruthy();

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/`);
    await expect(page.getByText(/E2E Test Brand/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
