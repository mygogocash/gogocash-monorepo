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
    file: "apps/app/app/(tabs)/discover.tsx",
    routeId: "discover",
  },
  {
    component: "CustomerDiscoveryScreen",
    file: "apps/app/app/(tabs)/shops.tsx",
    routeId: "shops",
  },
  { component: "CustomerDiscoveryScreen", file: "apps/app/app/brand.tsx", routeId: "brand" },
  {
    component: "CustomerDiscoveryScreen",
    file: "apps/app/app/category/index.tsx",
    routeId: "category",
  },
  { component: "CustomerGoLinkScreen", file: "apps/app/app/golink.tsx", routeId: "golink" },
] as const;

const publicDetailBatchRoutes = [
  {
    component: "CustomerShopDetailScreen",
    file: "apps/app/app/shop/[id].tsx",
    routeId: "shopDetail",
  },
  {
    component: "CustomerCategoryDetailScreen",
    file: "apps/app/app/category/[name].tsx",
    routeId: "categoryDetail",
  },
  {
    component: "CustomerPrivacyPolicyScreen",
    file: "apps/app/app/privacy-policy.tsx",
    routeId: "privacyPolicy",
  },
] as const;

const authBatchRoutes = [
  { component: "CustomerAuthScreen", file: "apps/app/app/login.tsx", routeId: "login" },
  { component: "CustomerAuthScreen", file: "apps/app/app/register.tsx", routeId: "register" },
  {
    component: "CustomerAccountSetupScreen",
    file: "apps/app/app/account-setup.tsx",
    routeId: "accountSetup",
  },
  {
    component: "CustomerAuthCallbackScreen",
    file: "apps/app/app/auth/callback.tsx",
    routeId: "authCallback",
  },
] as const;

const accountMoneyBatchRoutes = [
  {
    component: "CustomerProfileScreen",
    file: "apps/app/app/(tabs)/profile.tsx",
    routeId: "profile",
  },
  { component: "CustomerWalletScreen", file: "apps/app/app/wallet.tsx", routeId: "wallet" },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/app/app/withdraw/index.tsx",
    routeId: "withdraw",
  },
  {
    component: "CustomerWithdrawMethodScreen",
    file: "apps/app/app/method/index.tsx",
    routeId: "method",
  },
] as const;

const profileDetailBatchRoutes = [
  {
    component: "CustomerProfileDetailScreen",
    file: "apps/app/app/profile/info.tsx",
    routeId: "profileInfo",
  },
  {
    component: "CustomerProfilePhoneScreen",
    file: "apps/app/app/profile/cf-phone.tsx",
    routeId: "profileConfirmPhone",
  },
  {
    component: "CustomerProfilePhoneScreen",
    file: "apps/app/app/profile/verify-phone.tsx",
    routeId: "profileVerifyPhone",
  },
  {
    component: "Redirect",
    file: "apps/app/app/profile/my-rating.tsx",
    routeId: "profileRating",
  },
  {
    component: "CustomerProfileOffersScreen",
    file: "apps/app/app/profile/offer.tsx",
    routeId: "profileOffers",
  },
  {
    component: "CustomerFavoriteBrandsScreen",
    file: "apps/app/app/favorite.tsx",
    routeId: "favorite",
  },
  {
    component: "CustomerReferralScreen",
    file: "apps/app/app/referral.tsx",
    routeId: "referral",
  },
  {
    component: "CustomerAccountSettingsScreen",
    file: "apps/app/app/language.tsx",
    routeId: "language",
  },
  {
    component: "CustomerPrivacyCenterScreen",
    file: "apps/app/app/privacy-center.tsx",
    routeId: "privacyCenter",
  },
] as const;

const finalParityBatchRoutes = [
  {
    component: "CustomerAgeVerificationScreen",
    file: "apps/app/app/age-verification.tsx",
    routeId: "ageVerification",
  },
  {
    component: "CustomerCreditScoreScreen",
    file: "apps/app/app/credit-score.tsx",
    routeId: "creditScore",
  },
  {
    component: "CustomerLinkCashbackScreen",
    file: "apps/app/app/link-mycashback/index.tsx",
    routeId: "linkMycashback",
  },
  {
    component: "CustomerMyCashbackSignInScreen",
    file: "apps/app/app/link-mycashback/my-cashback-sign-in.tsx",
    routeId: "linkMycashbackSignIn",
  },
  {
    component: "CustomerMembershipScreen",
    file: "apps/app/app/membership.tsx",
    routeId: "membership",
  },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/app/app/method/create.tsx",
    routeId: "methodCreate",
  },
  {
    component: "CustomerMissingOrdersScreen",
    file: "apps/app/app/missing-orders.tsx",
    routeId: "missingOrders",
  },
  { component: "CustomerQuestScreen", file: "apps/app/app/(tabs)/quest.tsx", routeId: "quest" },
  {
    component: "CustomerQuestScreen",
    file: "apps/app/app/quest/history.tsx",
    routeId: "questHistory",
  },
  {
    component: "CustomerMoneyActionScreen",
    file: "apps/app/app/withdraw/my-cashback.tsx",
    routeId: "withdrawMycashback",
  },
] as const;

const billingBatchRoutes = [
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/app/app/pricing.tsx",
    routeId: "pricing",
  },
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/app/app/subscription.tsx",
    routeId: "subscription",
  },
  {
    component: "CustomerSubscriptionScreen",
    file: "apps/app/app/billing.tsx",
    routeId: "billing",
  },
] as const;

// The Expo route tree lives under apps/app/app/. Resolve a customer webPath to its
// Expo Router route file using Expo Router's filesystem conventions, trying the
// candidate locations a given webPath could map to (group-folder tab routes,
// nested index files, and dynamic [param] segments are all valid here).
const expoAppRoot = path.join(repoRoot, "apps/app/app");

function resolveExpoRouteFile(webPath: string): string | null {
  const segments = webPath.split("/").filter((part) => part.length > 0);
  // Tab routes live inside the (tabs) group folder; "/" is the home tab index.
  const tabBase = path.join(expoAppRoot, "(tabs)", ...segments);
  const base = path.join(expoAppRoot, ...segments);
  const candidates =
    segments.length === 0
      ? [path.join(expoAppRoot, "(tabs)", "index.tsx"), path.join(expoAppRoot, "index.tsx")]
      : [`${tabBase}.tsx`, path.join(tabBase, "index.tsx"), `${base}.tsx`, path.join(base, "index.tsx")];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

describe("Expo customer conversion matrix", () => {
  it("expo conversion matrix > given current customer routes > then every route has a real Expo route file", () => {
    // The legacy Next customer web (src/app/[locale]) was retired; the static
    // expoConversionRouteOwnership array is now the canonical route inventory.
    // nextCustomerRoutes is derived from it, so the two must stay in lockstep...
    expect(nextCustomerRoutes.map((route) => route.webPath).sort()).toEqual(
      expoConversionRouteOwnership.map((route) => route.webPath).sort()
    );

    // ...and no customer route may be forgotten: every owned webPath must resolve
    // to an actual Expo Router file under apps/app/app/.
    const unresolved = expoConversionRouteOwnership
      .filter((route) => resolveExpoRouteFile(route.webPath) === null)
      .map((route) => route.webPath);

    expect(unresolved).toEqual([]);
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
      path.join(repoRoot, "apps/app/app/(tabs)/index.tsx"),
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
