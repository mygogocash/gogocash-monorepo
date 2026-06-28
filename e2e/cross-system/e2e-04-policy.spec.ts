import { expect, test } from "@playwright/test";
import {
  buildCustomerSession,
  seedCustomerSession,
} from "../helpers/customer-auth";
import { getOfferById } from "../helpers/api-client";
import { loadE2eSeed } from "../helpers/seed-data";

test.describe("E2E-04 brand policy → customer shop detail", () => {
  test("customer shop detail shows seeded custom terms", async ({
    page,
    request,
  }) => {
    const seed = loadE2eSeed();
    const offer = await getOfferById(request, seed.brandId, seed.apiUrl);
    expect(String(offer.custom_terms ?? "")).toContain("E2E terms");

    await seedCustomerSession(
      page,
      buildCustomerSession(seed.userId, seed.customerToken),
    );
    await page.goto(`${seed.appUrl}/shop/${seed.brandId}`);
    await expect(page.getByText(/E2E terms/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
