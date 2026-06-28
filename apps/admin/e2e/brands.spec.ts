import { test } from "@playwright/test";
import { expectRouteLoads } from "./helpers";

test.describe("admin brands", () => {
  test("brands list loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands", /brands|management/i);
  });

  test("create brand page loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands/create-brand", /create|brand|affiliate/i);
  });

  test("top brands tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=top-brands", /top brands|save top brands/i);
  });

  test("commission tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=commission", /commission|partner rates/i);
  });

  test("policy tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=policy", /policy|terms/i);
  });

  test("deeplink tab loads", async ({ page }) => {
    await expectRouteLoads(page, "/brands?tab=deeplink", /tracking|deeplink|link/i);
  });
});
