import { expect, test } from "@playwright/test";
import {
  buildCustomerSession,
  seedCustomerSession,
} from "../helpers/customer-auth";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-05 coupon → customer shop detail", () => {
  test("seeded coupon is linked to brand and shop detail loads", async ({
    page,
    request,
  }) => {
    const seed = loadE2eSeed();

    const couponRes = await request.get(
      `${seed.apiUrl}/offer/get-coupon-id/${seed.brandId}`,
    );
    expect(couponRes.ok()).toBeTruthy();
    const coupons = (await couponRes.json()) as Array<{ code?: string }>;
    expect(
      coupons.some((coupon) =>
        new RegExp(seed.couponCode, "i").test(String(coupon.code ?? "")),
      ),
    ).toBeTruthy();

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/shop/${seed.brandId}`);
    await expect(page.getByText(/E2E Test Brand/i).first()).toBeVisible({
      timeout: 30_000,
    });
    // Shop detail does not render coupon codes yet — assert the deals section shell.
    await expect(
      page.getByText(/Target Top Coupons and Deals/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
