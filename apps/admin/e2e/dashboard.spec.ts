import { test } from "@playwright/test";
import { expectRouteLoads } from "./helpers";

test.describe("admin dashboard", () => {
  test("ADM-01 platform dashboard loads", async ({ page }) => {
    await expectRouteLoads(page, "/dashboard", /dashboard|platform|statistics/i);
  });
});
