import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { mobileParityRoutes, type MobileRouteId } from "@mobile/navigation/routes";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

const expoRouteFiles: Record<MobileRouteId, string> = {
  accountSetup: "app/account-setup.tsx",
  ageVerification: "app/age-verification.tsx",
  authCallback: "app/auth/callback.tsx",
  billing: "app/billing.tsx",
  brand: "app/brand.tsx",
  category: "app/category/index.tsx",
  categoryDetail: "app/category/[name].tsx",
  creditScore: "app/credit-score.tsx",
  discover: "app/(tabs)/discover.tsx",
  favorite: "app/favorite.tsx",
  gototrack: "app/gototrack/index.tsx",
  gototrackMerchant: "app/gototrack/merchant/[id].tsx",
  gototrackOnboarding: "app/gototrack/onboarding.tsx",
  gototrackPermissions: "app/gototrack/permissions.tsx",
  gototrackRecovery: "app/gototrack/recovery.tsx",
  gototrackSettings: "app/gototrack/settings.tsx",
  gototrackTimeline: "app/gototrack/timeline.tsx",
  golink: "app/golink.tsx",
  home: "app/(tabs)/index.tsx",
  language: "app/language.tsx",
  linkMycashback: "app/link-mycashback/index.tsx",
  linkMycashbackSignIn: "app/link-mycashback/my-cashback-sign-in.tsx",
  login: "app/login.tsx",
  membership: "app/membership.tsx",
  method: "app/method/index.tsx",
  methodCreate: "app/method/create.tsx",
  missingOrders: "app/missing-orders.tsx",
  pricing: "app/pricing.tsx",
  privacyCenter: "app/privacy-center.tsx",
  privacyPolicy: "app/privacy-policy.tsx",
  profile: "app/(tabs)/profile.tsx",
  profileConfirmPhone: "app/profile/cf-phone.tsx",
  profileInfo: "app/profile/info.tsx",
  profileOffers: "app/profile/offer.tsx",
  profileRating: "app/profile/my-rating.tsx",
  profileVerifyPhone: "app/profile/verify-phone.tsx",
  quest: "app/(tabs)/quest.tsx",
  questHistory: "app/quest/history.tsx",
  referral: "app/referral.tsx",
  register: "app/register.tsx",
  shopDetail: "app/shop/[id].tsx",
  shops: "app/(tabs)/shops.tsx",
  subscription: "app/subscription.tsx",
  wallet: "app/wallet.tsx",
  withdraw: "app/withdraw/index.tsx",
  withdrawMycashback: "app/withdraw/my-cashback.tsx",
};

describe("GoGoCash Expo route files", () => {
  it("expo route files > given route catalog parity > then every route has a live file", () => {
    expect(Object.keys(expoRouteFiles).sort()).toEqual(
      mobileParityRoutes.map((route) => route.id).sort()
    );

    for (const route of mobileParityRoutes) {
      expect(fs.existsSync(path.join(mobileRoot, expoRouteFiles[route.id])), route.id).toBe(true);
    }
  });
});
