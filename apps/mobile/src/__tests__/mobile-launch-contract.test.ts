import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import mobileExpoConfig from "../../app.config";
import {
  appIdentity,
  deepLinkRoutes,
  envDefaults,
  mobileSessionFields,
} from "@mobile/config/mobileAppConfig";
import { validateMobileEnv } from "@mobile/config/env";
import {
  findRouteByNativePath,
  getProtectedRouteIds,
  mobileParityRoutes,
} from "@mobile/navigation/routes";

const expectedRouteIds = [
  "home",
  "discover",
  "brand",
  "category",
  "categoryDetail",
  "shops",
  "shopDetail",
  "quest",
  "golink",
  "privacyPolicy",
  "login",
  "register",
  "authCallback",
  "accountSetup",
  "linkMycashback",
  "linkMycashbackSignIn",
  "profile",
  "profileInfo",
  "profileConfirmPhone",
  "profileVerifyPhone",
  "profileRating",
  "profileOffers",
  "wallet",
  "withdraw",
  "withdrawMycashback",
  "method",
  "methodCreate",
  "favorite",
  "referral",
  "billing",
  "subscription",
  "pricing",
  "membership",
  "creditScore",
  "missingOrders",
  "ageVerification",
  "language",
  "privacyCenter",
  "questHistory",
  "gogosense",
  "gogosenseOnboarding",
  "gogosensePermissions",
  "gogosenseTimeline",
  "gogosenseSettings",
  "gogosenseRecovery",
  "gogosenseMerchant",
] as const;

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("GoGoCash mobile launch contract", () => {
  it("mobile route catalog > given web customer routes > then maps every route to a native screen", () => {
    expect(mobileParityRoutes.map((route) => route.id)).toEqual(expectedRouteIds);
    expect(mobileParityRoutes).toHaveLength(46);
    expect(mobileParityRoutes.every((route) => route.nativePath.length > 0)).toBe(true);
    expect(mobileParityRoutes.every((route) => route.title.length > 0)).toBe(true);
  });

  it("mobile route catalog > given account routes > then marks protected screens explicitly", () => {
    expect(getProtectedRouteIds()).toEqual([
      "profile",
      "profileInfo",
      "profileConfirmPhone",
      "profileVerifyPhone",
      "profileRating",
      "profileOffers",
      "wallet",
      "withdraw",
      "withdrawMycashback",
      "method",
      "methodCreate",
      "favorite",
      "referral",
      "billing",
      "subscription",
      "pricing",
      "membership",
      "creditScore",
      "missingOrders",
      "ageVerification",
      "language",
      "privacyCenter",
      "questHistory",
      "gogosense",
      "gogosenseOnboarding",
      "gogosensePermissions",
      "gogosenseTimeline",
      "gogosenseSettings",
      "gogosenseRecovery",
      "gogosenseMerchant",
    ]);
  });

  it("deep link contract > given store launch defaults > then exposes stable GoGoCash links", () => {
    expect(appIdentity).toEqual({
      displayName: "GoGoCash",
      scheme: "gogocash",
      iosBundleIdentifier: "co.gogocash.app",
      androidPackage: "co.gogocash.app",
    });
    expect(deepLinkRoutes).toEqual({
      login: "gogocash://login",
      authCallback: "gogocash://auth/callback",
      shopDetail: "gogocash://shop/:id",
      quest: "gogocash://quest",
      profile: "gogocash://profile",
      wallet: "gogocash://wallet",
      withdraw: "gogocash://withdraw",
      gogosense: "gogocash://gogosense",
      gogosenseActivation: "gogocash://gogosense/activate",
    });
  });

  it("mobile env contract > given staging launch > then defaults to staging public endpoints", () => {
    expect(envDefaults).toEqual({
      accountDataSource: "fixtures",
      apiUrl: "https://api-staging.gogocash.co",
      appEnv: "staging",
      frontendUrl: "https://app-staging.gogocash.co",
    });
  });

  it("expo config > given SDK 56 native config plugins > then includes the status bar plugin", () => {
    const config = mobileExpoConfig({ config: {} } as Parameters<typeof mobileExpoConfig>[0]);

    expect(config.plugins).toContain("expo-status-bar");
  });

  it("production launch contract > given EAS production profile > then it explicitly targets production public endpoints", () => {
    const easConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    expect(easConfig.build.production.env).toMatchObject({
      EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "disabled",
      EXPO_PUBLIC_API_URL: "https://api.gogocash.co",
      EXPO_PUBLIC_APP_ENV: "production",
      EXPO_PUBLIC_FRONTEND_URL: "https://app.gogocash.co",
    });
    expect(JSON.stringify(easConfig.build.production.env)).not.toContain("staging");
  });

  it("production env guard > given cleartext production URLs > then startup rejects the config", () => {
    expect(() =>
      validateMobileEnv({
        accountDataSource: "disabled",
        apiUrl: "http://api.gogocash.co",
        appEnv: "production",
        frontendUrl: "https://app.gogocash.co",
        posthogHost: "",
        posthogKey: "",
        sentryDsn: "",
      })
    ).toThrow("Production Expo API URL must use HTTPS.");

    expect(() =>
      validateMobileEnv({
        accountDataSource: "fixtures",
        apiUrl: "https://api.gogocash.co",
        appEnv: "production",
        frontendUrl: "https://app.gogocash.co",
        posthogHost: "",
        posthogKey: "",
        sentryDsn: "",
      })
    ).toThrow("Production Expo account data source cannot use fixtures.");
  });

  it("production launch contract > given Expo app links > then production app domain is configured", () => {
    const config = mobileExpoConfig({ config: {} } as Parameters<typeof mobileExpoConfig>[0]);

    expect(config.ios?.associatedDomains).toContain("applinks:app.gogocash.co");
  });

  it("mobile session contract > given web session fields > then preserves the same native keys", () => {
    expect(mobileSessionFields).toEqual([
      "_id",
      "email",
      "username",
      "access_token",
      "wallet",
      "region",
      "mobile",
      "birthdate",
      "gender",
      "id_telegram",
      "provider",
      "is_new_user",
      "auth_flow",
      "avatar_url",
    ]);
  });

  it("mobile route lookup > given a native path > then returns the matching route contract", () => {
    expect(findRouteByNativePath("/shop/[id]")).toMatchObject({
      id: "shopDetail",
      webPath: "/shop/[id]",
      nativePath: "/shop/[id]",
      featureGroup: "shops",
    });
  });
});
