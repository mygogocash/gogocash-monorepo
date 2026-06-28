import { test } from "@playwright/test";
import { expectPublicRoute } from "./helpers";

test.describe("customer home", () => {
  test("CUS-01 home discovery loads", async ({ page }) => {
    await expectPublicRoute(page, "/", /Top Brands|All Shops|Search brands/i);
  });
});

test.describe("customer shops", () => {
  test("CUS-02 shop directory loads", async ({ page }) => {
    await expectPublicRoute(page, "/shops", /shop|cashback|store/i);
  });
});

test.describe("customer brand directory", () => {
  test("CUS-03 brand directory loads", async ({ page }) => {
    await expectPublicRoute(page, "/brand", /brand|cashback/i);
  });
});

test.describe("customer category", () => {
  test("CUS-04 category list loads", async ({ page }) => {
    await expectPublicRoute(page, "/category", /categor/i);
  });
});

test.describe("customer discover", () => {
  test("discover page loads", async ({ page }) => {
    await expectPublicRoute(page, "/discover", /discover|search|filter/i);
  });
});

test.describe("customer golink", () => {
  test("CUS-08 GoGoLink page loads", async ({ page }) => {
    await expectPublicRoute(page, "/golink", /link|paste|preview|GoGoLink/i);
  });
});

test.describe("customer legal", () => {
  test("privacy policy loads", async ({ page }) => {
    await expectPublicRoute(page, "/privacy-policy", /Privacy Policy/i);
  });
});

test.describe("customer catalog", () => {
  test("catalog home loads", async ({ page }) => {
    await expectPublicRoute(page, "/catalog", /catalog|product|shop/i);
  });
});

test.describe("customer desktop shell", () => {
  test.use({ viewport: { width: 1624, height: 900 } });

  test("desktop home shell loads", async ({ page }) => {
    await expectPublicRoute(page, "/", /Top Brands|Trending Brands/i);
  });
});
