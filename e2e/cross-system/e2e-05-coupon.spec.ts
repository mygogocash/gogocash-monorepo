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
    const coupons = (await couponRes.json()) as Array<{
      _id?: string;
      code?: string;
      code_enabled?: boolean;
      destination_url?: string;
      name?: string;
      terms_and_conditions?: string;
    }>;
    expect(coupons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: seed.visibleCodeCouponId,
          code: seed.couponCode,
          code_enabled: true,
          terms_and_conditions: "E2E #339 visible-code terms.",
        }),
        expect.objectContaining({
          _id: seed.linkOnlyCouponId,
          code: "",
          code_enabled: false,
          destination_url: seed.couponDestinationUrl,
          name: seed.linkOnlyCouponName,
          terms_and_conditions: "E2E #339 link-only terms.",
        }),
      ]),
    );

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/shop/${seed.brandId}`);
    await expect(page.getByText(/E2E Test Brand/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(/Target Top Coupons and Deals/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(seed.couponCode)).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(`Copy code ${seed.couponCode}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(`Use coupon ${seed.linkOnlyCouponName}`, "i"),
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Read terms & conditions for E2E #339/i,
      }),
    ).toHaveCount(2);
  });
});
