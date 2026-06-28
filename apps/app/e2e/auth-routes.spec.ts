import { expect, test } from "@playwright/test";
import { loadCustomerSeed, seedJwtSession } from "./helpers";

test.describe("customer auth guard", () => {
  test("CUS-13 protected wallet redirects when logged out", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page).toHaveURL(/login/, { timeout: 20_000 });
  });
});

test.describe("customer JWT routes", () => {
  test.beforeEach(async ({ page }) => {
    const seed = loadCustomerSeed();
    test.skip(!seed, "E2E seed missing — run npm run e2e:seed");
    await seedJwtSession(page, seed!);
  });

  test("CUS-06 wallet loads with backend JWT", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page.getByText(/wallet|cashback|withdraw/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-07 payout methods loads", async ({ page }) => {
    await page.goto("/method");
    await expect(page.getByText(/Withdraw Method|withdrawal methods/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-05 favorites loads", async ({ page }) => {
    await page.goto("/favorite");
    await expect(page.getByText(/favorite|saved/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-09 quest hub loads", async ({ page }) => {
    await page.goto("/quest");
    await expect(page.getByText(/quest|reward|point/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-11 referral loads", async ({ page }) => {
    await page.goto("/referral");
    await expect(page.getByText(/refer|invite|share/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-12 profile loads", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText(/Profile|Personal Information/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("CUS-10 missing orders form loads", async ({ page }) => {
    await page.goto("/missing-orders");
    await expect(page.getByText(/missing order|claim|submit/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("withdraw page loads", async ({ page }) => {
    await page.goto("/withdraw");
    await expect(page.getByText(/withdraw/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("privacy center loads with backend JWT", async ({ page }) => {
    await page.goto("/privacy-center");
    await expect(page.getByText(/Privacy center|consent/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
