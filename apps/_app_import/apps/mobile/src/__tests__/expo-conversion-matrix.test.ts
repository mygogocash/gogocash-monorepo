import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  expoConversionRouteOwnership,
  getMigratedExpoRouteIds,
  nextCustomerRoutes,
} from "@mobile/navigation/expoConversionMatrix";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../../..");

const publicBatchRoutes = [
  {
    component: "CustomerDiscoveryScreen",
    file: "apps/mobile/app/(tabs)/discover.tsx",
    routeId: "discover",
  },
  {
    component: "CustomerDiscoveryScreen",
    file: "apps/mobile/app/(tabs)/shops.tsx",
    routeId: "shops",
  },
  { component: "CustomerDiscoveryScreen", file: "apps/mobile/app/brand.tsx", routeId: "brand" },
  {
    component: "CustomerDiscoveryScreen",
    file: "apps/mobile/app/category/index.tsx",
    routeId: "category",
  },
  { component: "CustomerGoLinkScreen", file: "apps/mobile/app/golink.tsx", routeId: "golink" },
] as const;

const publicDetailBatchRoutes = [
  {
    component: "CustomerShopDetailScreen",
    file: "apps/mobile/app/shop/[id].tsx",
    routeId: "shopDetail",
  },
  {
    component: "CustomerCategoryDetailScreen",
    file: "apps/mobile/app/category/[name].tsx",
    routeId: "categoryDetail",
  },
  {
    component: "CustomerPrivacyPolicyScreen",
    file: "apps/mobile/app/privacy-policy.tsx",
    routeId: "privacyPolicy",
  },
] as const;

const authBatchRoutes = [
  { component: "CustomerAuthScreen", file: "apps/mobile/app/login.tsx", routeId: "login" },
  { component: "CustomerAuthScreen", file: "apps/mobile/app/register.tsx", routeId: "register" },
  {
    component: "CustomerAccountSetupScreen",
    file: "apps/mobile/app/account-setup.tsx",
    routeId: "accountSetup",
  },
  {
    component: "CustomerAuthCallbackScreen",
    file: "apps/mobile/app/auth/callback.tsx",
    routeId: "authCallback",
  },
] as const;

const accountMoneyBatchRoutes = [
  {
    component: "CustomerProfileScreen",
    file: "apps/mobile/app/(tabs)/profile.tsx",
    routeId: "profile",
  },
  { component: "CustomerWalletScreen", file: "apps/mobile/app/wallet.tsx", routeId: "wallet" },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/mobile/app/withdraw/index.tsx",
    routeId: "withdraw",
  },
  {
    component: "CustomerWithdrawMethodScreen",
    file: "apps/mobile/app/method/index.tsx",
    routeId: "method",
  },
] as const;

const profileDetailBatchRoutes = [
  {
    component: "CustomerProfileDetailScreen",
    file: "apps/mobile/app/profile/info.tsx",
    routeId: "profileInfo",
  },
  {
    component: "CustomerProfilePhoneScreen",
    file: "apps/mobile/app/profile/cf-phone.tsx",
    routeId: "profileConfirmPhone",
  },
  {
    component: "CustomerProfilePhoneScreen",
    file: "apps/mobile/app/profile/verify-phone.tsx",
    routeId: "profileVerifyPhone",
  },
  {
    component: "Redirect",
    file: "apps/mobile/app/profile/my-rating.tsx",
    routeId: "profileRating",
  },
  {
    component: "CustomerProfileOffersScreen",
    file: "apps/mobile/app/profile/offer.tsx",
    routeId: "profileOffers",
  },
  {
    component: "CustomerFavoriteBrandsScreen",
    file: "apps/mobile/app/favorite.tsx",
    routeId: "favorite",
  },
  {
    component: "CustomerReferralScreen",
    file: "apps/mobile/app/referral.tsx",
    routeId: "referral",
  },
  {
    component: "CustomerAccountSettingsScreen",
    file: "apps/mobile/app/language.tsx",
    routeId: "language",
  },
  {
    component: "CustomerPrivacyCenterScreen",
    file: "apps/mobile/app/privacy-center.tsx",
    routeId: "privacyCenter",
  },
] as const;

const finalParityBatchRoutes = [
  {
    component: "CustomerAgeVerificationScreen",
    file: "apps/mobile/app/age-verification.tsx",
    routeId: "ageVerification",
  },
  {
    component: "CustomerCreditScoreScreen",
    file: "apps/mobile/app/credit-score.tsx",
    routeId: "creditScore",
  },
  {
    component: "CustomerLinkCashbackScreen",
    file: "apps/mobile/app/link-mycashback/index.tsx",
    routeId: "linkMycashback",
  },
  {
    component: "CustomerMyCashbackSignInScreen",
    file: "apps/mobile/app/link-mycashback/my-cashback-sign-in.tsx",
    routeId: "linkMycashbackSignIn",
  },
  {
    component: "CustomerMembershipScreen",
    file: "apps/mobile/app/membership.tsx",
    routeId: "membership",
  },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/mobile/app/method/create.tsx",
    routeId: "methodCreate",
  },
  {
    component: "CustomerMissingOrdersScreen",
    file: "apps/mobile/app/missing-orders.tsx",
    routeId: "missingOrders",
  },
  { component: "CustomerQuestScreen", file: "apps/mobile/app/(tabs)/quest.tsx", routeId: "quest" },
  {
    component: "CustomerQuestScreen",
    file: "apps/mobile/app/quest/history.tsx",
    routeId: "questHistory",
  },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/mobile/app/withdraw/my-cashback.tsx",
    routeId: "withdrawMycashback",
  },
] as const;

const billingBatchRoutes = [
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/mobile/app/pricing.tsx",
    routeId: "pricing",
  },
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/mobile/app/subscription.tsx",
    routeId: "subscription",
  },
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/mobile/app/billing.tsx",
    routeId: "billing",
  },
] as const;

function discoverNextCustomerRoutes() {
  const appRoot = path.join(repoRoot, "src/app/[locale]");
  const routes: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name === "page.tsx") {
        const route = path
          .relative(appRoot, dir)
          .split(path.sep)
          .filter((part) => part !== "." && !part.startsWith("("))
          .join("/");
        routes.push(route ? `/${route}` : "/");
      }
    }
  }

  walk(appRoot);

  return routes
    .filter((route) => !route.startsWith("/demo-") && !route.startsWith("/sentry-"))
    .sort();
}

describe("Expo customer conversion matrix", () => {
  it("expo conversion matrix > given current Next customer routes > then every route has Expo ownership", () => {
    const discoveredRoutes = discoverNextCustomerRoutes();

    expect(nextCustomerRoutes.map((route) => route.webPath).sort()).toEqual(discoveredRoutes);
    expect(expoConversionRouteOwnership.map((route) => route.webPath).sort()).toEqual(
      discoveredRoutes
    );
  });

  it("expo conversion matrix > given migrated home route > then home is no longer parity shell", () => {
    expect(getMigratedExpoRouteIds()).toContain("home");
    expect(expoConversionRouteOwnership.find((route) => route.webPath === "/")).toMatchObject({
      expoRouteId: "home",
      status: "migrated",
    });
  });

  it("home route conversion > given Expo route file > then uses dedicated customer home screen", () => {
    const routeFile = fs.readFileSync(
      path.join(repoRoot, "apps/mobile/app/(tabs)/index.tsx"),
      "utf8"
    );

    expect(routeFile).toContain("CustomerHomeScreen");
    expect(routeFile).not.toContain("NativeParityScreen");
  });

  it("expo conversion matrix > given public discovery batch > then routes are marked migrated", () => {
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(publicBatchRoutes.map((route) => route.routeId))
    );
  });

  it("public route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of publicBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given public detail and legal batch > then routes are marked migrated", () => {
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(publicDetailBatchRoutes.map((route) => route.routeId))
    );
  });

  it("public detail route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of publicDetailBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given auth and onboarding batch > then routes are marked migrated", () => {
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(authBatchRoutes.map((route) => route.routeId))
    );
  });

  it("auth route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of authBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given account and money entry batch > then routes are marked migrated", () => {
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(accountMoneyBatchRoutes.map((route) => route.routeId))
    );
  });

  it("account money route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of accountMoneyBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given profile detail batch > then routes are marked migrated", () => {
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(profileDetailBatchRoutes.map((route) => route.routeId))
    );
  });

  it("profile detail route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of profileDetailBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given remaining non-backend customer routes > then no parity shell remains", () => {
    expect(expoConversionRouteOwnership.filter((route) => route.status === "parity_shell")).toEqual(
      []
    );
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(finalParityBatchRoutes.map((route) => route.routeId))
    );
  });

  it("remaining route conversion > given Expo route files > then use dedicated customer screens", () => {
    for (const route of finalParityBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });

  it("expo conversion matrix > given billing backend contract exists > then billing routes are marked migrated", () => {
    expect(
      expoConversionRouteOwnership.filter((route) => route.status === "backend_migration")
    ).toEqual([]);
    expect(getMigratedExpoRouteIds()).toEqual(
      expect.arrayContaining(billingBatchRoutes.map((route) => route.routeId))
    );
  });

  it("billing route conversion > given Expo route files > then use dedicated subscription screen", () => {
    for (const route of billingBatchRoutes) {
      const routeFile = fs.readFileSync(path.join(repoRoot, route.file), "utf8");

      expect(routeFile).toContain(route.component);
      expect(routeFile).not.toContain("NativeParityScreen");
    }
  });
});
