import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

type MobilePackageJson = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  expo?: {
    install?: {
      exclude?: string[];
    };
  };
};

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as MobilePackageJson;
const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const latestExpoRuntimeDependencies = [
  "@expo/metro-runtime",
  "expo",
  "expo-font",
  "expo-linking",
  "expo-router",
  "expo-secure-store",
  "expo-splash-screen",
  "expo-status-bar",
  "react",
  "react-dom",
  "react-native",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-web",
] as const;

describe("mobile Expo SDK target", () => {
  it("expo sdk target > given latest stable Expo release > then mobile package targets SDK 57", () => {
    expect(packageJson.dependencies.expo).toMatch(/^\^?~?57\./);
    expect(packageJson.dependencies.react).toMatch(/^19\.2\./);
    expect(packageJson.dependencies["react-dom"]).toMatch(/^19\.2\./);
    expect(packageJson.dependencies["react-native"]).toMatch(/^0\.86\./);

    const unpinnedRuntimeDependencies = latestExpoRuntimeDependencies.filter(
      (dependencyName) => packageJson.dependencies[dependencyName] === "latest",
    );

    expect(unpinnedRuntimeDependencies).toEqual([]);
  });

  it("Expo SDK 57 compatibility > given SDK-managed native packages > then versions match the stable SDK bundle", () => {
    expect(packageJson.dependencies["@sentry/react-native"]).toBe("~7.11.0");
    expect(packageJson.dependencies["@shopify/flash-list"]).toBe("2.3.2");
    expect(packageJson.dependencies["react-native-safe-area-context"]).toBe(
      "~5.8.0",
    );
    expect(packageJson.dependencies["react-native-screens"]).toBe("4.26.2");
    expect(packageJson.dependencies["react-native-svg"]).toBe("15.15.5");
  });

  it("Expo SDK 57 compatibility > given the intentional TypeScript 7 compiler lane > then Doctor validates SDK packages without downgrading the compiler", () => {
    expect(packageJson.devDependencies.typescript).toBe("^7.0.2");
    expect(packageJson.expo?.install?.exclude).toContain("typescript");
  });

  it("local Expo modules > given Expo re-exports the optional native-module loader > then app code does not depend on expo-modules-core directly", () => {
    expect(packageJson.dependencies["expo-modules-core"]).toBeUndefined();

    for (const modulePath of [
      "modules/gototrack-detector/index.ts",
      "modules/gototrack-live-activity/index.ts",
    ]) {
      const source = fs.readFileSync(path.join(appRoot, modulePath), "utf8");

      expect(source).toContain('from "expo"');
      expect(source).not.toContain('from "expo-modules-core"');
    }
  });
});
