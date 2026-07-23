import { expect, test } from "@playwright/test";
import { expectRouteLoads } from "./helpers";

const routes: Array<{
  path: string;
  hint: RegExp;
  name: string;
  heading?: boolean;
}> = [
  { path: "/banner", hint: /banner|carousel/i, name: "banners" },
  { path: "/coupon", hint: /coupon/i, name: "coupons" },
  { path: "/coupon/history", hint: /history|coupon/i, name: "coupon history" },
  { path: "/withdraw", hint: /withdraw/i, name: "withdraw queue" },
  { path: "/conversion", hint: /conversion/i, name: "conversions" },
  { path: "/transactions", hint: /transaction/i, name: "transactions" },
  { path: "/fee", hint: /fee/i, name: "fee config" },
  { path: "/users", hint: /user|gogocash/i, name: "users" },
  { path: "/quest", hint: /quest/i, name: "quest" },
  { path: "/reward", hint: /reward/i, name: "rewards" },
  { path: "/points", hint: /point/i, name: "points" },
  { path: "/category", hint: /categor/i, name: "category" },
  { path: "/discover", hint: /discover/i, name: "discover" },
  { path: "/search-config", hint: /search/i, name: "search config" },
  { path: "/membership", hint: /membership/i, name: "membership" },
  { path: "/subscription", hint: /subscription/i, name: "subscription" },
  { path: "/credit-score", hint: /credit|score|rating/i, name: "credit scores" },
  { path: "/referral", hint: /referral/i, name: "referrals" },
  { path: "/catalog", hint: /catalog|access denied|overview/i, name: "catalog admin" },
  { path: "/admin-users", hint: /admin user|team/i, name: "admin users" },
  { path: "/roles", hint: /role/i, name: "roles" },
  {
    path: "/missing-orders",
    hint: /^missing conversions$/i,
    name: "missing conversions",
    heading: true,
  },
];

test.describe("admin domain routes", () => {
  for (const route of routes) {
    test(`${route.name} (${route.path}) loads`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await expectRouteLoads(page, route.path, route.hint, {
        heading: route.heading,
      });
      expect(pageErrors, `uncaught errors on ${route.path}`).toEqual([]);
    });
  }
});
