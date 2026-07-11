import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { createRequire } from "node:module";
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
  "gototrack",
  "gototrackOnboarding",
  "gototrackPermissions",
  "gototrackSettings",
  "gototrackMerchant",
] as const;

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const requireFromTest = createRequire(import.meta.url);

describe("GoGoCash mobile launch contract", () => {
  it("mobile route catalog > given web customer routes > then maps every route to a native screen", () => {
    expect(mobileParityRoutes.map((route) => route.id)).toEqual(expectedRouteIds);
    expect(mobileParityRoutes).toHaveLength(44);
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
      "gototrack",
      "gototrackOnboarding",
      "gototrackPermissions",
      "gototrackSettings",
      "gototrackMerchant",
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
      gototrack: "gogocash://gototrack",
      gototrackActivation: "gogocash://gototrack/activate",
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

  it("expo config > given SDK 57 native config plugins > then includes the status bar plugin", () => {
    const config = mobileExpoConfig({ config: {} } as Parameters<typeof mobileExpoConfig>[0]);

    expect(config.plugins).toContain("expo-status-bar");
  });

  it("production launch contract > given EAS production profile > then it explicitly targets production public endpoints", () => {
    const easConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    expect(easConfig.build.production.env).toMatchObject({
      // Play launch 2026-07-11: production ships live backend account data.
      EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
      EXPO_PUBLIC_API_URL: "https://api.gogocash.co",
      EXPO_PUBLIC_APP_ENV: "production",
      EXPO_PUBLIC_FRONTEND_URL: "https://app.gogocash.co",
    });
    expect(JSON.stringify(easConfig.build.production.env)).not.toContain("staging");
  });

  it("dev launch contract > given EAS development profile > then it targets dev API for Android device QA", () => {
    const easConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    expect(easConfig.build.development.env).toMatchObject({
      EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
      EXPO_PUBLIC_API_URL: "https://api.dev.gogocash.co",
      EXPO_PUBLIC_APP_ENV: "dev",
      EXPO_PUBLIC_FRONTEND_URL: "http://localhost:8081",
    });
  });

  it("staging launch contract > given EAS preview profile > then it uses backend account data against staging API", () => {
    const easConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    expect(easConfig.build.preview.env).toMatchObject({
      EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
      EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co",
      EXPO_PUBLIC_APP_ENV: "staging",
      EXPO_PUBLIC_FRONTEND_URL: "https://app-staging.gogocash.co",
    });
    expect(easConfig.build.preview.env?.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
  });

  it("EAS launch contract > given every build profile > then it inlines EXPO_PUBLIC_EAS_PROJECT_ID for OTA", () => {
    const easConfig = JSON.parse(fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8")) as {
      build: Record<string, { env?: Record<string, string> }>;
    };
    const easProjectId = "0039c25f-f88e-491d-8da9-85b8d6e66558";

    for (const profile of Object.values(easConfig.build)) {
      expect(profile.env?.EXPO_PUBLIC_EAS_PROJECT_ID).toBe(easProjectId);
    }
  });

  it("EAS launch contract > given eas.json env blocks > then Firebase keys are not literal $ placeholders", () => {
    const easJson = fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8");

    expect(easJson).not.toMatch(/\$EXPO_PUBLIC_FIREBASE_/);
  });

  it("EAS launch contract > given eas.json env blocks > then observability keys are not literal $ placeholders", () => {
    const easJson = fs.readFileSync(path.join(mobileRoot, "eas.json"), "utf8");

    expect(easJson).not.toMatch(/\$EXPO_PUBLIC_SENTRY_/);
    expect(easJson).not.toMatch(/\$EXPO_PUBLIC_POSTHOG_/);
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
      "membership_tier",
    ]);
  });

  it("gototrack config > given Android UsageStats MVP > then declares Usage Access and FGS monitor permissions", () => {
    const appConfigSource = fs.readFileSync(path.join(mobileRoot, "app.config.js"), "utf8");
    const pluginSource = fs.readFileSync(
      path.join(mobileRoot, "plugins/withGototrackUsageAccess.js"),
      "utf8",
    );
    const {
      applyGototrackUsageAccessManifest,
      GOGOSENSE_USAGE_STATS_PERMISSION,
    } = requireFromTest("../../plugins/withGototrackUsageAccess.js") as {
      applyGototrackUsageAccessManifest: (manifest: Record<string, any>) => Record<string, any>;
      GOGOSENSE_USAGE_STATS_PERMISSION: string;
    };
    const manifest = applyGototrackUsageAccessManifest({ manifest: { $: {} } }.manifest);
    const duplicateSafeManifest = applyGototrackUsageAccessManifest(manifest);
    const usagePermissions = duplicateSafeManifest["uses-permission"] as Array<{
      $?: Record<string, string>;
    }>;

    expect(appConfigSource).toContain("./plugins/withGototrackUsageAccess");
    expect(pluginSource).toContain("android.permission.PACKAGE_USAGE_STATS");
    expect(pluginSource).not.toContain("android.permission.QUERY_ALL_PACKAGES");
    expect(pluginSource).not.toContain("BIND_NOTIFICATION_LISTENER_SERVICE");
    expect(pluginSource).not.toContain("<service");
    expect(duplicateSafeManifest.$["xmlns:tools"]).toBe("http://schemas.android.com/tools");
    expect(usagePermissions).toHaveLength(4);
    const usageStatsPermission = usagePermissions.find(
      (entry) => entry?.$?.["android:name"] === GOGOSENSE_USAGE_STATS_PERMISSION,
    );
    expect(usageStatsPermission?.$).toMatchObject({
      "android:name": GOGOSENSE_USAGE_STATS_PERMISSION,
      "tools:ignore": "ProtectedPermissions",
    });
    expect(
      usagePermissions.filter((entry) => entry?.$?.["android:name"] === GOGOSENSE_USAGE_STATS_PERMISSION),
    ).toHaveLength(1);
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
